import { join } from "node:path";
import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  Notification,
  powerMonitor,
  session,
  shell,
  WebContentsView,
} from "electron";
import type {
  ChromeState,
  ChromeVoice,
  DndSwitch,
  Palette,
  ServerRow,
  SettingsView,
  SwitcherView,
  VoiceAction,
  VoiceReport,
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
import type { Settings } from "./settings";
import { ACCELERATORS, serverAccelerator, serverHint } from "./shortcuts";
import { loadWindowState, saveWindowState, type WindowState } from "./state";
import { Switcher } from "./switcher";
import { activeTheme, onSystemTheme, paletteFor, shellTheme } from "./theme";
import { AppTray, hideOnClose } from "./tray";
import { windowIcon } from "./trayIcon";
import type { Updates } from "./updates";
import {
  parseVoiceReport,
  trayVoiceItems,
  voiceLabel,
  voiceMenuItems,
} from "./voice";

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
  // What the page says it captures; null outside voice.
  voice: VoiceReport | null;
  // When its current call started, so the latest call speaks for the strip.
  joinedAt: number;
}

// A loaded server is asked again this long after its last answer, when
// the window comes back to the front. A gated one is asked every
// GATE_POLL_MS regardless, so the page clears as soon as it can.
const RECHECK_MS = 5 * 60 * 1000;
const GATE_POLL_MS = 30 * 1000;
// How long the strip says what just happened out of sight.
const NOTICE_MS = 4000;

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
  // The live indicator's popover, over whichever server is in front.
  private voicePanel: Switcher<ChromeVoice>;
  // The strip's notice and the timer that clears it.
  private notice = "";
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private dndTimer: ReturnType<typeof setTimeout> | undefined;
  // The server an `open` link offered to add, and the path it named.
  private invited: { server: string; path: string } | null = null;

  constructor(private updates: Updates) {
    this.tray = new AppTray({
      updateItems: () => this.updateTrayItems(),
      serverItems: () => this.serverMenuItems(),
      voiceItems: () => this.voiceTrayItems(),
      voiceTooltip: () => this.voiceTooltip(),
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
      icon: windowIcon(),
    });
    this.switcher = new Switcher(
      this.win,
      STRIP_HEIGHT,
      (view) => this.load(view, "switcher"),
      () => this.refocus(),
    );
    this.voicePanel = new Switcher<ChromeVoice>(
      this.win,
      STRIP_HEIGHT,
      (view) => this.load(view, "voice"),
      () => this.refocus(),
      IPC.voicePanel,
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
    this.win.on("blur", () => {
      this.switcher.hide(false);
      this.voicePanel.hide(false);
    });
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
    const unwatch = this.updates.onChange(() => this.updateChanged());
    this.armDndEnd();
    const rearm = () => this.armDndEnd();
    powerMonitor.on("resume", rearm);
    this.win.on("closed", () => {
      unfollow();
      unwatch();
      clearTimeout(this.dndTimer);
      powerMonitor.off("resume", rearm);
      this.switcher.destroy();
      this.voicePanel.destroy();
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
          `--stoop-notifications=${this.bannersAllowed()}`,
          `--stoop-voice-cues=${this.tray.settings.voiceCues}`,
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
      voice: null,
      joinedAt: 0,
    };
    this.slots.set(server.id, slot);
    const wc = view.webContents;
    // A page that reloads, navigates away or crashes has dropped its call
    // without saying so.
    const dropVoice = () => {
      if (!slot.voice) return;
      slot.voice = null;
      this.voiceChanged();
    };
    wc.on("did-start-navigation", (details) => {
      if (details.isMainFrame && !details.isSameDocument) dropVoice();
    });
    wc.on("render-process-gone", dropVoice);
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
    this.voicePanel.layout();
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

  showPage(page?: string, query = "") {
    // The add page opened any other way is not the invitation.
    if (page === "add") this.invited = null;
    if (page) this.load(this.page, page, query);
    for (const s of this.slots.values()) s.view.setVisible(false);
    this.page.setVisible(true);
    this.switcher.hide();
    this.voicePanel.hide(false);
    // The page takes the keyboard, as a server does when it comes
    // forward. Without this the strip keeps it, and whatever was clicked
    // to get here — the gear — stays lit as though still being pressed.
    // Closing the switcher refocuses too, so this is only doing the work
    // when the panel was never open.
    this.refocus();
    this.pushChrome();
  }

  // App settings, open on About: where the app says how it stands with
  // its next version.
  showAbout() {
    this.showPage("settings", "?section=about");
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
    // An end belongs to an "on", and one already past is off.
    if ("dnd" in next || "dndUntil" in next) {
      const until =
        "dndUntil" in next
          ? (next.dndUntil ?? null)
          : this.tray.settings.dndUntil;
      next.dnd =
        (next.dnd ?? this.tray.settings.dnd) &&
        (until === null || until > Date.now());
      next.dndUntil = next.dnd ? until : null;
    }
    this.tray.update(next);
    this.applyTheme();
    if ("dnd" in next) {
      // Every server page sets its own server to match the switch.
      this.tellServers(IPC.stoopDnd, this.dnd);
      this.armDndEnd();
    }
    if ("notifications" in next || "dnd" in next)
      this.tellServers(IPC.stoopNotifications, this.bannersAllowed());
    if ("voiceCues" in next) {
      // Every server page asks the app before a cue plays; the Voice
      // menu's checkbox shows the same switch.
      this.tellServers(IPC.stoopVoiceCues, this.tray.settings.voiceCues);
      this.rebuildAppMenu();
    }
  }

  // The switch as it stands, for a page asking as it loads.
  get dnd(): DndSwitch {
    const { dnd, dndUntil } = this.tray.settings;
    const on = dnd && (dndUntil === null || dndUntil > Date.now());
    return { on, until: on ? dndUntil : null };
  }

  // When the switch's end passes, banners come back. No server is told:
  // each ends it on its own, and an "off" from here would clear one set
  // since on another device. Armed again after sleep, which holds timers.
  private armDndEnd() {
    clearTimeout(this.dndTimer);
    const { dnd, dndUntil } = this.tray.settings;
    if (!dnd || dndUntil === null) return;
    this.dndTimer = setTimeout(
      () => {
        this.tray.update({ dnd: false, dndUntil: null });
        this.tellServers(IPC.stoopNotifications, this.bannersAllowed());
      },
      Math.max(0, dndUntil - Date.now()),
    );
  }

  // Banners come through only with notifications on and do not disturb
  // off; the app holds them itself the moment either changes, before any
  // server has answered.
  private bannersAllowed(): boolean {
    return this.tray.settings.notifications && !this.dnd.on;
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
      accent: palette.accent,
      platform: process.platform,
      newer: slot?.newer ?? false,
      update:
        this.updates.state.kind === "ready" ? this.updates.state.version : null,
      settings: this.pageName === "settings",
      voice: this.chromeVoice(),
      ok: palette.ok,
      danger: palette.danger,
      notice: this.notice,
    };
    this.win.setBackgroundColor(palette.canvas);
    this.chrome.webContents.send(IPC.chromeState, state);
    this.page.webContents.send(IPC.theme, palette);
    this.switcher.theme(palette);
    this.refreshSwitcher();
    this.voicePanel.theme(palette);
    // The popover follows the call: repainted as it changes, gone with it.
    if (state.voice) this.voicePanel.update(state.voice);
    else this.voicePanel.hide(false);
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
      if (slot.voice) this.voiceChanged();
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
    else {
      this.voicePanel.hide(false);
      this.switcher.show(this.switcherView());
    }
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
        accelerator: serverHint(i, mac),
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
      dnd: this.dnd.on,
      dndUntil: this.dnd.until,
      notifications: this.tray.settings.notifications,
      voiceCues: this.tray.settings.voiceCues,
      version: app.getVersion(),
      platform: process.platform,
      update: this.updates.state,
      deb: this.updates.deb,
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

  // ---- the live indicator ----

  setVoice(webContentsId: number, raw: unknown) {
    const slot = this.serverFor(webContentsId);
    if (!slot) return;
    const was = slot.voice;
    slot.voice = parseVoiceReport(raw);
    if (!was && slot.voice) {
      slot.joinedAt = Date.now();
      this.leaveOthers(slot);
    }
    this.voiceChanged();
  }

  // One call at a time across servers. Every join starts muted, so the new
  // call is silent while the old one goes. A page too old for "leave" still
  // takes the rest, and is quiet even if it stays connected.
  private leaveOthers(joined: Slot) {
    const left: string[] = [];
    for (const other of this.slots.values()) {
      if (other === joined || !other.voice) continue;
      const wc = other.view.webContents;
      if (wc.isDestroyed()) continue;
      for (const action of ["mute", "camera-off", "stop-screen", "leave"])
        wc.send(IPC.voiceAction, action);
      left.push(other.server.name);
    }
    if (left.length) this.flashNotice(`Left voice on ${left.join(", ")}`);
  }

  private flashNotice(text: string) {
    clearTimeout(this.noticeTimer);
    this.notice = text;
    this.noticeTimer = setTimeout(() => {
      this.notice = "";
      if (!this.win.isDestroyed()) this.pushChrome();
    }, NOTICE_MS);
  }

  private voiceChanged() {
    this.pushChrome();
    this.tray.refresh();
    this.rebuildAppMenu();
  }

  // The server whose page holds voice: the latest to join, because a page
  // too old to leave when asked can still be holding a silenced call.
  private voiceSlot(): Slot | undefined {
    let latest: Slot | undefined;
    for (const slot of this.slots.values())
      if (slot.voice && (!latest || slot.joinedAt > latest.joinedAt))
        latest = slot;
    return latest;
  }

  // In front, the space names the call; behind, the server does, because
  // that is what someone switching back would look for.
  private voiceWhere(slot: Slot): string {
    const voice = slot.voice;
    if (!voice) return "";
    const place =
      slot.server.id === this.front ? voice.space : slot.server.name;
    return `${voice.channel} · ${place}`;
  }

  private chromeVoice(): ChromeVoice | null {
    const slot = this.voiceSlot();
    if (!slot?.voice) return null;
    const { kind, mic, camera, screen, channel } = slot.voice;
    return { kind, mic, camera, screen, channel, where: this.voiceWhere(slot) };
  }

  // Acts on the call where it is. Only "show" switches servers.
  voiceAction(action: VoiceAction) {
    const slot = this.voiceSlot();
    if (!slot) return;
    if (action === "show") {
      this.voicePanel.hide(false);
      this.reveal();
      this.show(slot.server.id);
    }
    slot.view.webContents.send(IPC.voiceAction, action);
  }

  toggleVoicePanel() {
    if (this.voicePanel.open) {
      this.voicePanel.hide();
      return;
    }
    const voice = this.chromeVoice();
    if (!voice) return;
    this.switcher.hide(false);
    this.voicePanel.show(voice);
  }

  closeVoicePanel() {
    this.voicePanel.hide();
  }

  voiceTrayItems(): MenuItemConstructorOptions[] {
    const slot = this.voiceSlot();
    if (!slot?.voice) return [];
    return trayVoiceItems(slot.voice, this.voiceWhere(slot), (action) =>
      this.voiceAction(action),
    );
  }

  voiceTooltip(): string {
    const voice = this.voiceSlot()?.voice;
    return voice ? voiceLabel(voice.kind) : "";
  }

  // ---- updates ----

  // The updater moved: the strip's pill and the tray's item follow, and
  // the page view is told in case About is the page showing.
  private updateChanged() {
    this.pushChrome();
    this.tray.refresh();
    if (!this.page.webContents.isDestroyed())
      this.page.webContents.send(IPC.updateState, this.updates.state);
  }

  // The tray's one line about an update: the restart, once there is a
  // version to restart into.
  updateTrayItems(): MenuItemConstructorOptions[] {
    const state = this.updates.state;
    if (state.kind !== "ready") return [];
    return [
      {
        label: `Restart to update to Stoop ${state.version}`,
        click: () => this.updates.install(),
      },
    ];
  }

  // ---- the menu ----

  serverMenuItems(): MenuItemConstructorOptions[] {
    return this.servers.map((server, i) => {
      const badge = this.slots.get(server.id)?.badge ?? 0;
      return {
        label: badge ? `${server.name}  (${badge})` : server.name,
        type: "radio",
        checked: server.id === this.front,
        accelerator: serverAccelerator(i),
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
            accelerator: ACCELERATORS.settings,
            click: () => this.showPage("settings"),
          },
        ],
      },
      {
        label: "Voice",
        submenu: [
          ...voiceMenuItems(this.voiceSlot()?.voice ?? null, (action) =>
            this.voiceAction(action),
          ),
          { type: "separator" },
          // The App setting, mirrored where a call's other controls are,
          // so it can be flipped mid-call without opening settings.
          {
            label: "Join and leave sounds",
            type: "checkbox",
            checked: this.tray.settings.voiceCues,
            click: (item) => this.updateSettings({ voiceCues: item.checked }),
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
