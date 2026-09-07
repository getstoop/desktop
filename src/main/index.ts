import { app, BrowserWindow, ipcMain, shell } from "electron";
import { IPC, type Probe } from "../shared/bridge";
import { meetsMinimum, normalizeServerUrl, probeServer } from "./probe";
import { MainWindow } from "./window";

let main: MainWindow | null = null;

app.whenReady().then(() => {
  main = new MainWindow();
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
  ipcMain.on(IPC.openMenu, () => main?.popupServerMenu());
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) main = new MainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
