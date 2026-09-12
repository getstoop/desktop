import { join } from "node:path";
import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  Notification,
  session,
  shell,
  WebContentsView,
} from "electron";
import type {
  ChromeState,
  Palette,
  ServerRow,
  SettingsView,
  SwitcherView,
} from "../shared/bridge";
import { BRIDGE, IPC } from "../shared/bridge";
import { type ThemeId, themePreference } from "../shared/themes";
import { type DeepLink, targetUrl } from "./deeplink";
import { meetsMinimum, probeServer } from "./probe";
import { answerScreenShare } from "./screenshare";
import {
  loadServers,
  newServer,
  partitionFor,
  type Server,
  saveServers,
} from "./servers";
import { presenceChoice, type Settings } from "./settings";
import { loadWindowState, saveWindowState, type WindowState } from "./state";
import { StatusWatch } from "./status";
import { Switcher } from "./switcher";
import { activeTheme, onSystemTheme, paletteFor, shellTheme } from "./theme";
import { AppTray, hideOnClose } from "./tray";

// One window. The shell draws the title strip (a small view across the
// top: traffic lights, the front server's name as a menu, a dot when
// another server has unread) and places one view per server beneath it,
// one visible at a time. The app's own pages (add a server, a server
// that needs updating) are one more view in the same slot.
//
// The theme is the app's, not a server's: chosen in App settings, kept
// in settings.json, worn by every shell page whether or not a server is
// in front, and handed whole to every server page through window.stoop
// so the web app wears it too, whether or not it has a theme of that
// name.

const STRIP_HEIGHT = 32;
const shellPreload = join(__dirname, "../preload/shell.js");
const bridgePreload = join(__dirname, "../preload/bridge.js");

const rendererUrl = (page: string, query = "") =>
  process.env.ELECTRON_RENDERER_URL
    ? `${process.env.ELECTRON_RENDERER_URL}/${page}/index.html${query}`
    : null;
const rendererFile = (page: string) =>
  join(__dirname, `../renderer/${page}/index.html`);

interface Slot {
  server: Server;
  view: WebContentsView;
  badge: number;
  // Whether the server's web app is loaded, or the gate page stands in.
  loaded: boolean;
  gated: boolean;
  probedAt: number;
  // Why the gate page stands in, for showing it again on a switch.
  gate?: { kind: string; detail: string };
  // The server publishes a bridge level above what this app implements.
  newer: boolean;
  version: string;
  // URL a deep link asked for, loaded by the next checkAndLoad.
  pending?: string;
}

// A loaded server is asked again this long after its last answer, when
// the window comes back to the front. A gated one is asked every
// GATE_POLL_MS regardless, so the page clears as soon as it can.
const RECHECK_MS = 5 * 60 * 1000;
const GATE_POLL_MS = 30 * 1000;

export class MainWindow {
  readonly win: BrowserWindow;
  private chrome: WebContentsView;
  private page: WebContentsView;
  private slots = new Map<string, Slot>();
  private front: string | null = null; // server id, or null for the page view
  // What the page view last loaded, and whether it is the one showing:
  // the strip's gear lights for App settings and nothing else.
  private pageName: string | null = null;
  private servers: Server[] = loadServers();
  private state: WindowState = loadWindowState();
  readonly tray: AppTray;
  // The theme the app wears now, resolved from the preference.
  private theme: ThemeId;
  private switcher: Switcher;
  private status: StatusWatch;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  // The server an `open` link offered to add, and the path it named.
  private invited: { server: string; path: string } | null = null;

  constructor() {
    this.tray = new AppTray({
      serverItems: () => this.serverMenuItems(),
      unreadTotal: () => {
        let total = 0;
        for (const s of this.slots.values()) total += s.badge;
        return total;
      },
      showWindow: () => this.reveal(),
      showAddServer: () => {
        this.reveal();
        this.showPage("add");
      },
      showSettings: () => {
        this.reveal();
        this.showPage("settings");
      },
    });
    this.theme = activeTheme(this.tray.settings.theme);
    this.status = new StatusWatch(this.tray.settings.status, (status) =>
      this.tellServers(IPC.stoopStatus, status),
    );
    this.win = new BrowserWindow({
      width: 1200,
      height: 800,
      ...this.state.bounds,
      minWidth: 720,
      minHeight: 480,
      show: false,
      titleBarStyle: "hidden",
      trafficLightPosition: { x: 13, y: 10 },
      backgroundColor: this.palette().canvas,
    });
    this.switcher = new Switcher(
      this.win,
      STRIP_HEIGHT,
      (view) => this.load(view, "switcher"),
      () => this.refocus(),
    );
    this.chrome = this.shellView("chrome");
    this.page = this.shellView("add");
    this.win.contentView.addChildView(this.chrome);
    this.win.contentView.addChildView(this.page);
    this.win.on("resize", () => {
      this.layout();
      this.remember();
    });
    this.win.on("move", () => this.remember());
    this.win.on("blur", () => this.switcher.hide(false));
    this.win.on("focus", () => this.recheck(false));
    const poll = setInterval(() => this.recheck(true), GATE_POLL_MS);
    this.win.on("closed", () => clearInterval(poll));
    this.win.on("close", (event) => {
      this.remember(true);
      if (hideOnClose(this.tray.settings)) {
        event.preventDefault();
        this.win.hide();
      }
    });
    const unfollow = onSystemTheme(() => this.applyTheme());
    this.win.on("closed", () => {
      unfollow();
      this.status.stop();
      this.switcher.destroy();
      this.tray.destroy();
    });
    if (this.state.maximized) this.win.maximize();
    // The window loads no page of its own, so ready-to-show never fires;
    // show once the strip has painted, or after a moment regardless.
    const reveal = () => {
      if (!this.win.isDestroyed() && !this.win.isVisible()) this.win.show();
    };
    this.chrome.webContents.once("did-finish-load", () => {
      this.pushChrome();
      reveal();
    });
    setTimeout(reveal, 1500);
    this.layout();

    for (const server of this.servers) this.openSlot(server);
    const front =
      this.servers.find((s) => s.id === this.state.front) ?? this.servers[0];
    if (front) this.show(front.id);
    else this.showPage("add");
  }

  // Brings the window back from hidden or minimized.
  reveal() {
    if (this.win.isMinimized()) this.win.restore();
    this.win.show();
    this.win.focus();
  }

  // Writes the window state a moment after the last change, or now.
  private remember(now = false) {
    clearTimeout(this.saveTimer);
    const write = () => {
      if (this.win.isDestroyed()) return;
      saveWindowState({
        bounds: this.win.isMaximized()
          ? this.state.bounds
          : this.win.getNormalBounds(),
        maximized: this.win.isMaximized(),
        front: this.front ?? undefined,
      });
    };
    if (now) write();
    else this.saveTimer = setTimeout(write, 400);
  }

  // ---- views ----

  private shellView(page: string): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        preload: shellPreload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    view.setBackgroundColor(this.palette().canvas);
    this.load(view, page);
    return view;
  }

  private load(view: WebContentsView, page: string, query = "") {
    // Everything the page view is ever given comes through here — the
    // gate page and the filled-in add page go straight to load — so this
    // is the one place that can know what it holds.
    if (view === this.page) this.pageName = page;
    const dev = rendererUrl(page, query);
    if (dev) void view.webContents.loadURL(dev);
    else void view.webContents.loadFile(rendererFile(page), { search: query });
  }

  private openSlot(server: Server): Slot {
    const ses = session.fromPartition(partitionFor(server));
    answerScreenShare(
      ses,
      () => (this.win.isDestroyed() ? null : this.win),
      () => this.palette(),
    );
    ses.setUserAgent(desktopUserAgent(ses.getUserAgent()));
    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        preload: bridgePreload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        // The preload reads these back: the version so window.stoop and
        // the user agent name the same build, the theme so the page's
        // first paint is already in it.
        additionalArguments: [
          `--stoop-desktop-version=${app.getVersion()}`,
          `--stoop-theme=${encodeURIComponent(JSON.stringify(shellTheme(this.theme)))}`,
          `--stoop-status=${this.status.effective()}`,
          `--stoop-notifications=${this.tray.settings.notifications}`,
        ],
      },
    });
    view.setBackgroundColor(this.palette().canvas);
    const slot: Slot = {
      server,
      view,
      badge: 0,
      loaded: false,
      gated: false,
      probedAt: 0,
      newer: false,
      version: "",
    };
    this.slots.set(server.id, slot);
    const wc = view.webContents;
    wc.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: "deny" };
    });
    wc.on("will-navigate", (event, next) => {
      if (new URL(next).origin !== server.url) {
        event.preventDefault();
        void shell.openExternal(next);
      }
    });
    // The theme may have moved between the view being made and the page
    // loading; the page listens from its first script, so saying it
    // again here lands.
    wc.on("did-finish-load", () => {
      wc.send(IPC.stoopTheme, shellTheme(this.theme));
      wc.send(IPC.stoopStatus, this.status.effective());
    });
    wc.on("did-fail-load", (_event, code, description, _url, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      slot.loaded = false;
      this.gate(server, "unreachable", `${description} (${code})`);
    });
    // A notification click calls window.focus() inside the page, which
    // is this event: bring that server forward, and the window with it.
    wc.on("focus", () => {
      if (this.front !== server.id) this.show(server.id);
      if (!this.win.isFocused()) {
        if (this.win.isMinimized()) this.win.restore();
        this.win.show();
        this.win.focus();
      }
    });
    view.setVisible(false);
    this.win.contentView.addChildView(view);
    this.layout();
    void this.checkAndLoad(server);
    return slot;
  }

  // Asks the server what it is, then loads it, keeps it, or gates it.
  // A server already showing its web app is never reloaded by a check
  // that comes back fine; only a failure or a recovery changes the view.
  private async checkAndLoad(server: Server) {
    const slot = this.slots.get(server.id);
    if (!slot) return;
    const probe = await probeServer(server.url);
    slot.probedAt = Date.now();
    if (!probe.ok) {
      this.gate(server, probe.kind, probe.detail);
      return;
    }
    if (!meetsMinimum(probe.version)) {
      this.gate(server, "too-old", probe.version);
      return;
    }
    if (probe.name !== server.name) {
      server.name = probe.name;
      saveServers(this.servers);
    }
    slot.newer = probe.bridge > BRIDGE;
    slot.version = probe.version;
    const wasGated = slot.gated;
    slot.gated = false;
    // A deep link waiting on this slot replaces the server's root.
    const pending = slot.pending;
    slot.pending = undefined;
    if (!slot.loaded) {
      slot.loaded = true;
      void slot.view.webContents.loadURL(pending ?? `${server.url}/`);
    } else if (pending) {
      void slot.view.webContents.loadURL(pending);
    }
    if (wasGated && this.front === server.id) this.show(server.id);
    this.pushChrome();
  }

  private gate(server: Server, kind: string, detail: string) {
    const slot = this.slots.get(server.id);
    if (slot) {
      slot.gated = true;
      slot.gate = { kind, detail };
    }
    const q = `?id=${encodeURIComponent(server.id)}&name=${encodeURIComponent(server.name)}&url=${encodeURIComponent(server.url)}&kind=${kind}&detail=${encodeURIComponent(detail)}`;
    this.load(this.page, "gate", q);
    if (this.front === server.id) this.showPage();
    // A server behind the front one going quiet changes its row too.
    else this.refreshSwitcher();
  }

  // Gated servers are asked again on every poll; loaded ones only when
  // the window comes back to the front and their last answer is old.
  private recheck(pollOnly: boolean) {
    const now = Date.now();
    for (const slot of this.slots.values()) {
      const due = slot.gated || (!pollOnly && now - slot.probedAt > RECHECK_MS);
      if (due) void this.checkAndLoad(slot.server);
    }
  }

  private layout() {
    const [w, h] = this.win.getContentSize();
    this.chrome.setBounds({ x: 0, y: 0, width: w, height: STRIP_HEIGHT });
    const body = { x: 0, y: STRIP_HEIGHT, width: w, height: h - STRIP_HEIGHT };
    this.page.setBounds(body);
    for (const slot of this.slots.values()) slot.view.setBounds(body);
    this.switcher.layout();
  }

  // ---- what is in front ----

  show(id: string) {
    const slot = this.slots.get(id);
    if (!slot) return;
    if (slot.gated && slot.gate) {
      this.front = id;
      // The gate page comes up through showPage, which closes the panel.
      this.gate(slot.server, slot.gate.kind, slot.gate.detail);
      this.remember();
      return;
    }
    for (const s of this.slots.values()) s.view.setVisible(s === slot);
    this.page.setVisible(false);
    this.front = id;
    this.pageName = null;
    // Chosen from the panel, a shortcut, or a menu: the panel is done
    // either way, and the server takes the keyboard itself.
    this.switcher.hide(false);
    slot.view.webContents.focus();
    this.pushChrome();
    this.remember();
  }

  showPage(page?: string) {
    // The add page opened any other way is not the invitation.
    if (page === "add") this.invited = null;
    if (page) this.load(this.page, page);
    for (const s of this.slots.values()) s.view.setVisible(false);
    this.page.setVisible(true);
    this.switcher.hide();
    this.pushChrome();
  }

  // What the shell's own pages paint with: the active theme. A picker
  // window asks for it as it loads; the page view is told whenever it
  // changes.
  palette(): Palette {
    return paletteFor(this.theme);
  }

  // ---- the theme ----

  // A settings change from the page or the tray. The theme is the one
  // setting that repaints things, so it is checked and applied here.
  updateSettings(patch: Partial<Settings>) {
    const next = { ...patch };
    if ("theme" in next) next.theme = themePreference(next.theme);
    if ("status" in next) next.status = presenceChoice(next.status);
    this.tray.update(next);
    this.applyTheme();
    // The watch decides what the servers are told; setting the choice
    // announces it when the answer moved.
    if (next.status) this.status.set(next.status);
    if ("notifications" in next)
      this.tellServers(
        IPC.stoopNotifications,
        this.tray.settings.notifications,
      );
  }

  // One message to every server page that has one to receive it. The
  // shell's own pages are told through pushChrome and the settings view.
  private tellServers(channel: string, value: unknown) {
    for (const slot of this.slots.values()) {
      if (!slot.view.webContents.isDestroyed())
        slot.view.webContents.send(channel, value);
    }
  }

  // Fired from main rather than from a page, so what it proves is the
  // app's own plumbing to the OS — which is the part that was in doubt.
  // A page's test notification only ever proved that page's.
  testNotification() {
    if (!Notification.isSupported()) return;
    new Notification({
      title: "Stoop notifications are working",
      body: "This is what a mention looks like.",
    }).show();
  }

  // Resolves the preference again and, when the answer moved, repaints
  // everything the shell draws and tells every server page.
  private applyTheme() {
    const theme = activeTheme(this.tray.settings.theme);
    if (theme === this.theme) return;
    this.theme = theme;
    const canvas = this.palette().canvas;
    this.chrome.setBackgroundColor(canvas);
    this.page.setBackgroundColor(canvas);
    const whole = shellTheme(theme);
    for (const slot of this.slots.values()) {
      slot.view.setBackgroundColor(canvas);
      if (!slot.view.webContents.isDestroyed())
        slot.view.webContents.send(IPC.stoopTheme, whole);
    }
    this.pushChrome();
  }

  private pushChrome() {
    const slot = this.front ? this.slots.get(this.front) : undefined;
    const palette = this.palette();
    const state: ChromeState = {
      name: slot?.server.name ?? (this.servers.length ? "Stoop" : ""),
      dot: [...this.slots.values()].some((s) => s !== slot && s.badge > 0),
      color: palette.canvas,
      symbol: palette.text,
      platform: process.platform,
      newer: slot?.newer ?? false,
      settings: this.pageName === "settings",
    };
    this.win.setBackgroundColor(palette.canvas);
    this.chrome.webContents.send(IPC.chromeState, state);
    this.page.webContents.send(IPC.theme, palette);
    this.switcher.theme(palette);
    this.refreshSwitcher();
  }

  // ---- servers ----

  async addServer(url: string, name: string): Promise<Server> {
    const existing = this.servers.find((s) => s.url === url);
    if (existing) {
      this.show(existing.id);
      return existing;
    }
    const server = newServer(url, name);
    this.servers.push(server);
    saveServers(this.servers);
    const slot = this.openSlot(server);
    // Added from an invitation: the first load goes to the path it named.
    if (this.invited?.server === url) {
      const target = targetUrl({ action: "open", ...this.invited }, url);
      this.invited = null;
      if (target) slot.pending = target;
    }
    this.show(server.id);
    this.rebuildAppMenu();
    this.tray.refresh();
    return server;
  }

  removeServer(id: string) {
    const slot = this.slots.get(id);
    if (slot) {
      this.win.contentView.removeChildView(slot.view);
      slot.view.webContents.close();
      this.slots.delete(id);
    }
    this.servers = this.servers.filter((s) => s.id !== id);
    saveServers(this.servers);
    // Removing from the settings page keeps the page; removing the
    // server in front moves to the next one.
    const wasFront = this.front === id;
    if (wasFront) this.front = null;
    const next = this.servers[0];
    if (!next) this.showPage("add");
    else if (wasFront) this.show(next.id);
    this.rebuildAppMenu();
    this.tray.refresh();
  }

  retryServer(id: string) {
    const server = this.servers.find((s) => s.id === id);
    if (server) void this.checkAndLoad(server);
  }

  // ---- deep links ----

  // Reveals the window, then navigates the named server's view, or offers
  // to add a server that is not in the list.
  openDeepLink(link: DeepLink) {
    this.reveal();
    const server = this.servers.find((s) => s.url === link.server);
    if (!server) {
      // Only `open` may introduce a server; an `auth` link naming one
      // that is not in the list is dropped.
      if (link.action === "open") this.offerServer(link);
      return;
    }
    const target = targetUrl(link, server.url);
    if (!target) return;
    const known = this.slots.get(server.id);
    const slot = known ?? this.openSlot(server);
    if (slot.loaded && !slot.gated) {
      // The view already open for this server: a same-origin load keeps
      // its session storage, which the auth hand-back reads.
      void slot.view.webContents.loadURL(target);
    } else {
      slot.pending = target;
      // openSlot already probes; an existing slot is probed again.
      if (known) void this.checkAndLoad(server);
    }
    this.show(server.id);
  }

  // The add page with the address filled in, holding the path until the
  // server is added. Nothing is added here.
  private offerServer(link: DeepLink & { action: "open" }) {
    this.invited = { server: link.server, path: link.path };
    this.load(this.page, "add", `?url=${encodeURIComponent(link.server)}`);
    this.showPage();
  }

  // ---- the switcher ----

  toggleSwitcher() {
    if (this.switcher.open) this.switcher.hide();
    else this.switcher.show(this.switcherView());
  }

  closeSwitcher() {
    this.switcher.hide();
  }

  private switcherView(): SwitcherView {
    return {
      rows: this.serverRows(),
      // Under the strip button, which sits past the traffic lights on
      // macOS and at the left edge everywhere else.
      left: process.platform === "darwin" ? 84 : 12,
    };
  }

  private serverRows(): ServerRow[] {
    const mac = process.platform === "darwin";
    return this.servers.map((server, i) => {
      const slot = this.slots.get(server.id);
      const state = slot?.gated
        ? ((slot.gate?.kind ?? "unreachable") as ServerRow["state"])
        : "ok";
      return {
        id: server.id,
        name: server.name,
        host: hostOf(server.url),
        badge: slot?.badge ?? 0,
        state,
        current: server.id === this.front,
        accelerator: i < 9 ? (mac ? `⌘${i + 1}` : `Ctrl+${i + 1}`) : "",
      };
    });
  }

  // A list that changed under an open panel: repaint it where it stands.
  private refreshSwitcher() {
    if (this.switcher.open) this.switcher.update(this.switcherView());
  }

  // Where the keyboard goes when the panel closes: whatever is showing.
  // Without this the composer keeps its caret nowhere and the next
  // keystroke is lost.
  private refocus() {
    if (this.page.getVisible()) {
      this.page.webContents.focus();
      return;
    }
    const slot = this.front ? this.slots.get(this.front) : undefined;
    if (slot && !slot.view.webContents.isDestroyed())
      slot.view.webContents.focus();
  }

  // The server to return to from one of the app's own pages: the one
  // in front, or the last one that was.
  private lastFront(): Server | undefined {
    const id = this.front ?? this.state.front;
    return this.servers.find((s) => s.id === id) ?? this.servers[0];
  }

  // Leaves the app's own page for the server it came from.
  back() {
    const server = this.lastFront();
    if (server) this.show(server.id);
    else this.showPage("add");
  }

  // What the settings page shows.
  settingsView(): SettingsView {
    return {
      keepRunning: this.tray.settings.keepRunning,
      launchAtLogin: this.tray.settings.launchAtLogin,
      theme: this.tray.settings.theme,
      status: this.tray.settings.status,
      notifications: this.tray.settings.notifications,
      version: app.getVersion(),
      platform: process.platform,
      front: this.lastFront()?.name ?? null,
      servers: this.servers.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        version: this.slots.get(s.id)?.version ?? "",
      })),
    };
  }

  serverFor(webContentsId: number): Slot | undefined {
    for (const slot of this.slots.values())
      if (slot.view.webContents.id === webContentsId) return slot;
    return undefined;
  }

  setBadge(webContentsId: number, count: number) {
    const slot = this.serverFor(webContentsId);
    if (!slot) return;
    slot.badge = count;
    let total = 0;
    for (const s of this.slots.values()) total += s.badge;
    app.setBadgeCount(total);
    this.pushChrome();
    this.tray.refresh();
  }

  // ---- the menu ----

  serverMenuItems(): MenuItemConstructorOptions[] {
    return this.servers.map((server, i) => {
      const badge = this.slots.get(server.id)?.badge ?? 0;
      return {
        label: badge ? `${server.name}  (${badge})` : server.name,
        type: "radio",
        checked: server.id === this.front,
        accelerator: i < 9 ? `CmdOrCtrl+${i + 1}` : undefined,
        click: () => this.show(server.id),
      };
    });
  }

  rebuildAppMenu() {
    const isMac = process.platform === "darwin";
    const template: MenuItemConstructorOptions[] = [
      ...(isMac ? [{ role: "appMenu" as const }] : []),
      { role: "fileMenu" },
      { role: "editMenu" },
      {
        label: "Servers",
        submenu: [
          ...this.serverMenuItems(),
          { type: "separator" },
          { label: "Add a server…", click: () => this.showPage("add") },
          {
            label: "App settings…",
            accelerator: "CmdOrCtrl+,",
            click: () => this.showPage("settings"),
          },
        ],
      },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

// The address as someone would check it, without the scheme.
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

// A standard Chrome user agent with our marker appended, as the
// contract says (docs/architecture/desktop.md). Electron's default
// names Electron and the package, which is what identity providers
// key on to refuse an embedded browser.
export function desktopUserAgent(base: string): string {
  const chrome = base
    .replace(/\s?Electron\/\S+/, "")
    .replace(/\s?stoop-desktop\/\S+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return `${chrome} Stoop-Desktop/${app.getVersion()}`;
}
