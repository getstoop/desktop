import { contextBridge, ipcRenderer } from "electron";

// For the app's own pages only; never attached to a server page.
//
// Imports nothing but electron on purpose: a sandboxed preload cannot
// require another file, and a module shared with bridge.ts would be
// split into one. The channel name is IPC.openServer in shared/bridge.ts.
contextBridge.exposeInMainWorld("shell", {
  openServer(url: string) {
    ipcRenderer.send("shell:open-server", url);
  },
});
