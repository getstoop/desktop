import { app, BrowserWindow, ipcMain } from "electron";
import { IPC } from "../shared/bridge";
import { createWindow, openServer } from "./window";

// Until there is a server list (Desktop 2), the app opens its own page
// and loads whichever server the person types.

app.whenReady().then(() => {
  ipcMain.on(IPC.setBadge, (_event, count: number) => {
    app.setBadgeCount(count);
  });
  ipcMain.on(IPC.openServer, (event, url: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) openServer(win, url);
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
