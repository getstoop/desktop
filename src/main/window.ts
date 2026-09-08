import { join } from "node:path";
import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  session,
  shell,
  WebContentsView,
} from "electron";
import type { ChromeState, Palette, SettingsView } from "../shared/bridge";
import { BRIDGE, IPC } from "../shared/bridge";
import { meetsMinimum, probeServer } from "./probe";
import { answerScreenShare } from "./screenshare";
import {
  loadServers,
  newServer,
  partitionFor,
  type Server,
  saveServers,
} from "./servers";
import { loadWindowState, saveWindowState, type WindowState } from "./state";
import { derivePalette, readTokens } from "./theme";
import { AppTray, hideOnClose } from "./tray";

// One window. The shell draws the title strip (a small view across the
// top: traffic lights, the front server's name as a menu, a dot when
// another server has unread) and places one view per server beneath it,
// one visible at a time. The app's own pages (add a server, a server
// that needs updating) are one more view in the same slot.

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
  color: string;
  // Whether the server's web app is loaded, or the gate page stands in.
  loaded: boolean;
  gated: boolean;
  probedAt: number;
  // Why the gate page stands in, for showing it again on a switch.
  gate?: { kind: string; detail: string };
  // The web app's own colour tokens, as read off the page.
  tokens: Partial<Palette>;
  // The server publishes a bridge level above what this app implements.
  newer: boolean;
  version: string;
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
  private servers: Server[] = loadServers();
  private state: WindowState = loadWindowState();
  readonly tray: AppTray;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.win = new BrowserWindow({
      width: 1200,
      height: 800,
      ...this.state.bounds,
      minWidth: 720,
      minHeight: 480,
      show: false,
      titleBarStyle: "hidden",
      trafficLightPosition: { x: 13, y: 10 },
      backgroundColor: "#141517",
    });
    this.chrome = this.shellView("chrome");
    this.page = this.shellView("add");
    this.win.contentView.addChildView(this.chrome);
    this.win.contentView.addChildView(this.page);
    this.win.on("resize", () => {
      this.layout();
      this.remember();
    });
    this.win.on("move", () => this.remember());
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
    this.win.on("closed", () => this.tray.destroy());
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
    view.setBackgroundColor("#141517");
    this.load(view, page);
    return view;
  }

  private load(view: WebContentsView, page: string, query = "") {
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
        // The preload reads this back so window.stoop.version and the
        // user agent name the same build.
        additionalArguments: [`--stoop-desktop-version=${app.getVersion()}`],
      },
    });
    view.setBackgroundColor("#141517");
    const slot: Slot = {
      server,
      view,
      badge: 0,
      color: "#141517",
      loaded: false,
      gated: false,
      probedAt: 0,
      tokens: {},
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
    // theme-color paints the strip and the window behind everything;
    // the page's own tokens paint the shell's pages. The web app stamps
    // both together, so one event refreshes both.
    wc.on("did-change-theme-color", (_event, color) => {
      if (color) slot.color = color;
      void this.readTheme(slot);
    });
    wc.on("did-finish-load", () => void this.readTheme(slot));
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
    if (!slot.loaded) {
      slot.loaded = true;
      void slot.view.webContents.loadURL(`${server.url}/`);
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
  }

  // ---- what is in front ----

  show(id: string) {
    const slot = this.slots.get(id);
    if (!slot) return;
    if (slot.gated && slot.gate) {
      this.front = id;
      this.gate(slot.server, slot.gate.kind, slot.gate.detail);
      this.remember();
      return;
    }
    for (const s of this.slots.values()) s.view.setVisible(s === slot);
    this.page.setVisible(false);
    this.front = id;
    slot.view.webContents.focus();
    this.pushChrome();
    this.remember();
  }

  showPage(page?: string) {
    if (page) this.load(this.page, page);
    for (const s of this.slots.values()) s.view.setVisible(false);
    this.page.setVisible(true);
    this.pushChrome();
  }

  // What the shell's own pages paint with: the colours of the server in
  // front, its own where the page gave them up. A picker window asks for
  // it as it loads; the page view is told whenever it changes.
  palette(): Palette {
    const slot = this.front ? this.slots.get(this.front) : undefined;
    return { ...derivePalette(slot?.color), ...slot?.tokens };
  }

  private async readTheme(slot: Slot) {
    if (slot.view.webContents.isDestroyed()) return;
    slot.tokens = await readTokens(slot.view.webContents);
    if (this.front === slot.server.id) this.pushChrome();
  }

  private pushChrome() {
    const slot = this.front ? this.slots.get(this.front) : undefined;
    const color = slot?.color ?? "#141517";
    const state: ChromeState = {
      name: slot?.server.name ?? (this.servers.length ? "Stoop" : ""),
      dot: [...this.slots.values()].some((s) => s !== slot && s.badge > 0),
      color,
      symbol: symbolFor(color),
      platform: process.platform,
      newer: slot?.newer ?? false,
    };
    this.win.setBackgroundColor(color);
    this.chrome.webContents.send(IPC.chromeState, state);
    this.page.webContents.send(IPC.theme, this.palette());
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
    this.openSlot(server);
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
      ...this.tray.settings,
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

  popupServerMenu() {
    const items: MenuItemConstructorOptions[] = [
      ...this.serverMenuItems(),
      { type: "separator" },
      { label: "Add a server…", click: () => this.showPage("add") },
      { label: "App settings…", click: () => this.showPage("settings") },
    ];
    Menu.buildFromTemplate(items).popup({
      window: this.win,
      x: 84,
      y: STRIP_HEIGHT,
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

// Light text on a dark colour, dark text on a light one.
function symbolFor(hex: string): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1f1d1a" : "#e6e7ea";
}
