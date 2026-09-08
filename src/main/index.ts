import { resolve } from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { IPC, type Probe } from "../shared/bridge";
import { type DeepLink, linkFromArgv, parseDeepLink, SCHEME } from "./deeplink";
import { meetsMinimum, normalizeServerUrl, probeServer } from "./probe";
import type { Settings } from "./settings";
import { markQuitting } from "./tray";
import { MainWindow } from "./window";

let main: MainWindow | null = null;
// Links that arrived before there was a window to route them to: macOS
// can deliver open-url before the app is ready, and a cold start on
// Windows or Linux carries the link in argv.
const waiting: DeepLink[] = [];

function route(link: DeepLink | null) {
  if (!link) return;
  if (main) main.openDeepLink(link);
  else waiting.push(link);
}

// One instance owns the scheme. A second launch hands its link to the
// first and stops, so a link never opens a second window; nothing below
// has touched the tray, the settings or a window yet.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    route(linkFromArgv(argv));
    main?.reveal();
  });
  // macOS delivers links here, and may do it before `ready`.
  app.on("open-url", (event, url) => {
    event.preventDefault();
    route(parseDeepLink(url));
  });
  // Windows and Linux: the link that started this launch.
  route(linkFromArgv(process.argv));

  app.on("before-quit", () => markQuitting());
  app.whenReady().then(start);

  // With the window hidden in the tray the app is still running; only a
  // real close of the last window ends it, and never on macOS.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

function start() {
  claimScheme();
  main = new MainWindow();
  app.setLoginItemSettings({ openAtLogin: main.tray.settings.launchAtLogin });
  main.rebuildAppMenu();

  ipcMain.on(IPC.setBadge, (event, count: number) =>
    main?.setBadge(event.sender.id, count),
  );

  // The add-server page: check first, add only when the person confirms
  // by pressing Open on a good answer.
  ipcMain.handle(IPC.probe, async (_event, input: string): Promise<Probe> => {
    const origin = normalizeServerUrl(input);
    if (!origin)
      return {
        ok: false,
        kind: "not-stoop",
        detail: "That is not an address.",
      };
    return probeServer(origin);
  });
  ipcMain.handle(
    IPC.addServer,
    async (_event, input: string): Promise<Probe> => {
      const origin = normalizeServerUrl(input);
      if (!origin)
        return {
          ok: false,
          kind: "not-stoop",
          detail: "That is not an address.",
        };
      const probe = await probeServer(origin);
      if (probe.ok) {
        const server = await main?.addServer(origin, probe.name);
        if (server && !meetsMinimum(probe.version))
          main?.retryServer(server.id);
      }
      return probe;
    },
  );
  ipcMain.on(IPC.removeServer, (_event, id: string) => main?.removeServer(id));
  ipcMain.on(IPC.retryServer, (_event, id: string) => main?.retryServer(id));
  ipcMain.on(IPC.openSwitcher, () => main?.toggleSwitcher());
  ipcMain.on(IPC.closeSwitcher, () => main?.closeSwitcher());
  ipcMain.on(IPC.chooseServer, (_event, id: string) => main?.show(id));
  ipcMain.handle(IPC.getTheme, () => main?.palette());
  ipcMain.handle(IPC.getSettings, () => main?.settingsView());
  ipcMain.handle(IPC.setSettings, (_event, patch: unknown) => {
    main?.updateSettings(settingsPatch(patch));
    return main?.settingsView();
  });
  ipcMain.on(IPC.showPage, (_event, page: string) => {
    if (page === "back") main?.back();
    else if (page === "add" || page === "settings") main?.showPage(page);
  });
  // Until the app updates itself (Desktop 10), the hint opens the
  // releases page.
  ipcMain.on(IPC.updateApp, () => {
    void shell.openExternal("https://github.com/getstoop/desktop/releases");
  });
  ipcMain.on(IPC.openExternal, (_event, url: string) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  });
  ipcMain.on(IPC.windowAction, (_event, action: string) => {
    const win = main?.win;
    if (!win) return;
    if (action === "minimize") win.minimize();
    else if (action === "maximize")
      win.isMaximized() ? win.unmaximize() : win.maximize();
    else if (action === "close") win.close();
  });

  // The dock icon on macOS, or a second launch elsewhere: bring the
  // window back rather than open another.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) main = new MainWindow();
    else main?.reveal();
  });

  for (const link of waiting.splice(0)) main.openDeepLink(link);
}

// Claim stoop:// for this app. A packaged app is named by the installer
// as well; in dev the running binary is Electron itself, so the path to
// this checkout has to go with it or the OS launches a bare Electron.
function claimScheme() {
  if (!app.isPackaged && process.argv.length >= 2)
    app.setAsDefaultProtocolClient(SCHEME, process.execPath, [
      resolve(process.argv[1]),
    ]);
  else app.setAsDefaultProtocolClient(SCHEME);
}

// A patch from the settings page is remote input: only the fields that
// exist, each as the type it should be. The theme is checked by main.
function settingsPatch(raw: unknown): Partial<Settings> {
  const p = (raw ?? {}) as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (typeof p.keepRunning === "boolean") out.keepRunning = p.keepRunning;
  if (typeof p.launchAtLogin === "boolean") out.launchAtLogin = p.launchAtLogin;
  if (p.theme && typeof p.theme === "object")
    out.theme = p.theme as Settings["theme"];
  return out;
}
