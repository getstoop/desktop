import { resolve } from "node:path";
import { app, autoUpdater, BrowserWindow, ipcMain, shell } from "electron";
import { IPC, type Probe, VOICE_ACTIONS } from "../shared/bridge";
import { type DeepLink, linkFromArgv, parseDeepLink, SCHEME } from "./deeplink";
import { KEY_ACCESS_SETTINGS } from "./keys";
import { meetsMinimum, normalizeServerUrl, probeServer } from "./probe";
import type { Settings } from "./settings";
import { markQuitting } from "./tray";
import { Updates } from "./updates";
import { MainWindow } from "./window";

let main: MainWindow | null = null;
let updates: Updates | null = null;
// Links that arrived before `main` existed; drained at the end of start().
const waiting: DeepLink[] = [];

function route(link: DeepLink | null) {
  if (!link) return;
  if (main) main.openDeepLink(link);
  else waiting.push(link);
}

// A second launch forwards its link to the first and quits.
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
  // A restart into an update closes the windows before before-quit fires.
  autoUpdater.on("before-quit-for-update", () => markQuitting());
  app.whenReady().then(start);

  // With the window hidden in the tray the app is still running; only a
  // real close of the last window ends it, and never on macOS.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

function start() {
  claimScheme();
  updates = new Updates();
  main = new MainWindow(updates);
  app.setLoginItemSettings({ openAtLogin: main.tray.settings.launchAtLogin });
  main.rebuildAppMenu();
  updates.start();

  // A server page asking, as it loads, where the do not disturb switch is.
  ipcMain.on(IPC.getDnd, (event) => {
    event.returnValue = main?.dnd ?? { on: false, until: null };
  });
  ipcMain.on(IPC.setBadge, (event, count: number) =>
    main?.setBadge(event.sender.id, count),
  );
  ipcMain.on(IPC.setVoice, (event, report: unknown) =>
    main?.setVoice(event.sender.id, report),
  );
  // From the strip: the pill opens the popover, its Stop stops sharing.
  ipcMain.on(IPC.voiceClick, (_event, action: string) => {
    if (action === "open") main?.toggleVoicePanel();
    else if (action === "stop-screen") main?.voiceAction(action);
  });
  ipcMain.on(IPC.voicePanelAction, (_event, action: string) => {
    const known = VOICE_ACTIONS.find((a) => a === action);
    if (known) main?.voiceAction(known);
  });
  ipcMain.on(IPC.closeVoicePanel, () => main?.closeVoicePanel());

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
  ipcMain.on(IPC.testNotification, () => main?.testNotification());
  // The strip's pill: a restart when a version is waiting on one, and
  // otherwise — a server newer than this app — a look at About, with a
  // check under way for it to show.
  ipcMain.on(IPC.updateApp, () => {
    if (updates?.state.kind === "ready") updates.install();
    else {
      main?.showAbout();
      void updates?.check();
    }
  });
  ipcMain.handle(IPC.checkForUpdates, async () => {
    await updates?.check();
    return updates?.state ?? { kind: "off" };
  });
  ipcMain.on(IPC.installUpdate, () => updates?.install());
  ipcMain.on(IPC.openExternal, (_event, url: string) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  });
  // The one System Settings pane push to talk needs, by a fixed address:
  // openExternal takes only web links.
  ipcMain.on(IPC.openKeyAccess, () => {
    if (process.platform === "darwin")
      void shell.openExternal(KEY_ACCESS_SETTINGS);
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
    if (BrowserWindow.getAllWindows().length === 0 && updates)
      main = new MainWindow(updates);
    else main?.reveal();
  });

  for (const link of waiting.splice(0)) main.openDeepLink(link);
}

// Registers stoop:// for this binary; the installer does it too.
// Unpackaged, the binary is Electron, so the entry point goes with it.
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
  if (typeof p.dnd === "boolean") out.dnd = p.dnd;
  if (p.dndUntil === null || Number.isFinite(p.dndUntil))
    out.dndUntil = p.dndUntil as number | null;
  if (typeof p.notifications === "boolean") out.notifications = p.notifications;
  if (typeof p.voiceCues === "boolean") out.voiceCues = p.voiceCues;
  if (typeof p.pushToTalk === "boolean") out.pushToTalk = p.pushToTalk;
  return out;
}
