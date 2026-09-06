import { contextBridge, ipcRenderer } from "electron";
import {
  BRIDGE,
  IPC,
  type ShortcutName,
  type StoopBridge,
} from "../shared/bridge";

// Runs in every server page with contextIsolation on: the page sees only
// this object, never Node or ipcRenderer.
const stoop: StoopBridge = {
  bridge: BRIDGE,
  version: process.env.STOOP_DESKTOP_VERSION ?? "dev",
  platform: process.platform as StoopBridge["platform"],
  setBadge(count) {
    ipcRenderer.send(IPC.setBadge, Math.max(0, Math.floor(count)));
  },
  onShortcut(name: ShortcutName, handler) {
    const listener = (_: unknown, got: ShortcutName, down: boolean) => {
      if (got === name) handler(down);
    };
    ipcRenderer.on(IPC.shortcut, listener);
    return () => ipcRenderer.removeListener(IPC.shortcut, listener);
  },
};

contextBridge.exposeInMainWorld("stoop", stoop);
