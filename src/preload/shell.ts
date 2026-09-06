import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/bridge";

// For the app's own pages only; never attached to a server page.
contextBridge.exposeInMainWorld("shell", {
  openServer(url: string) {
    ipcRenderer.send(IPC.openServer, url);
  },
});
