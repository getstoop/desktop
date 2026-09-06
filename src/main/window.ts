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
import type { ChromeState } from "../shared/bridge";
import { IPC } from "../shared/bridge";
import { meetsMinimum, probeServer } from "./probe";
import { answerScreenShare } from "./screenshare";
import {
  loadServers,
  newServer,
  partitionFor,
  type Server,
  saveServers,
} from "./servers";

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
}

export class MainWindow {
  readonly win: BrowserWindow;
  private chrome: WebContentsView;
  private page: WebContentsView;
  private slots = new Map<string, Slot>();
  private front: string | null = null; // server id, or null for the page view
  private servers: Server[] = loadServers();

  constructor() {
    this.win = new BrowserWindow({
      width: 1200,
      height: 800,
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
    this.win.on("resize", () => this.layout());
    this.win.once("ready-to-show", () => this.win.show());
    this.chrome.webContents.once("did-finish-load", () => this.pushChrome());
    this.layout();

    for (const server of this.servers) this.openSlot(server);
    if (this.servers[0]) this.show(this.servers[0].id);
    else this.showPage("add");
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
    answerScreenShare(ses);
    ses.setUserAgent(`${ses.getUserAgent()} Stoop-Desktop/${app.getVersion()}`);
    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        preload: bridgePreload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    view.setBackgroundColor("#141517");
    const slot: Slot = { server, view, badge: 0, color: "#141517" };
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
    wc.on("did-change-theme-color", (_event, color) => {
      if (!color) return;
      slot.color = color;
      if (this.front === server.id) this.pushChrome();
    });
    wc.on("did-fail-load", (_event, code, description, _url, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      this.gate(server, "unreachable", `${description} (${code})`);
    });
    wc.on("focus", () => {
      if (this.front !== server.id) this.show(server.id);
    });
    view.setVisible(false);
    this.win.contentView.addChildView(view);
    this.layout();
    void this.checkAndLoad(server);
    return slot;
  }

  // Loads the server, or shows the needs-updating page in its slot.
  private async checkAndLoad(server: Server) {
    const probe = await probeServer(server.url);
    if (!probe.ok) {
      this.gate(server, probe.kind, probe.detail);
      return;
    }
    if (!meetsMinimum(probe.version)) {
      this.gate(server, "too-old", probe.version);
      return;
    }
    const slot = this.slots.get(server.id);
    if (!slot) return;
    if (probe.name !== server.name) {
      server.name = probe.name;
      saveServers(this.servers);
      this.pushChrome();
    }
    void slot.view.webContents.loadURL(`${server.url}/`);
  }

  private gate(server: Server, kind: string, detail: string) {
    const q = `?id=${encodeURIComponent(server.id)}&name=${encodeURIComponent(server.name)}&url=${encodeURIComponent(server.url)}&kind=${kind}&detail=${encodeURIComponent(detail)}`;
    this.load(this.page, "gate", q);
    if (this.front === server.id) this.showPage();
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
    for (const s of this.slots.values()) s.view.setVisible(s === slot);
    this.page.setVisible(false);
    this.front = id;
    slot.view.webContents.focus();
    this.pushChrome();
  }

  showPage(page?: string) {
    if (page) this.load(this.page, page);
    for (const s of this.slots.values()) s.view.setVisible(false);
    this.page.setVisible(true);
    this.pushChrome();
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
    };
    this.win.setBackgroundColor(color);
    this.chrome.webContents.send(IPC.chromeState, state);
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
    const next = this.servers[0];
    if (next) this.show(next.id);
    else {
      this.front = null;
      this.showPage("add");
    }
    this.rebuildAppMenu();
  }

  retryServer(id: string) {
    const server = this.servers.find((s) => s.id === id);
    if (server) void this.checkAndLoad(server);
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
        ],
      },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

// Light text on a dark colour, dark text on a light one.
function symbolFor(hex: string): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1f1d1a" : "#e6e7ea";
}
