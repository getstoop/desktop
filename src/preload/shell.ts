import { contextBridge, ipcRenderer } from "electron";

// For the app's own pages only; never attached to a server page.
//
// Imports nothing but electron on purpose: a sandboxed preload cannot
// require another file, and a module shared with bridge.ts would be
// split into one. The channel names are the IPC table in shared/bridge.ts.
contextBridge.exposeInMainWorld("shell", {
  probe: (url: string) => ipcRenderer.invoke("shell:probe", url),
  addServer: (url: string) => ipcRenderer.invoke("shell:add-server", url),
  removeServer: (id: string) => ipcRenderer.send("shell:remove-server", id),
  retryServer: (id: string) => ipcRenderer.send("shell:retry-server", id),
  openMenu: () => ipcRenderer.send("shell:open-menu"),
  updateApp: () => ipcRenderer.send("shell:update-app"),
  getSettings: () => ipcRenderer.invoke("shell:get-settings"),
  setSettings: (patch: unknown) =>
    ipcRenderer.invoke("shell:set-settings", patch),
  showPage: (page: string) => ipcRenderer.send("shell:show-page", page),
  onPickerSources: (handler: (payload: unknown) => void) => {
    ipcRenderer.on("shell:picker-sources", (_event, payload) =>
      handler(payload),
    );
  },
  pickerChoose: (choice: unknown) =>
    ipcRenderer.send("shell:picker-choice", choice),
  openExternal: (url: string) => ipcRenderer.send("shell:open-external", url),
  windowAction: (action: string) =>
    ipcRenderer.send("shell:window-action", action),
  onChromeState: (handler: (state: unknown) => void) => {
    ipcRenderer.on("shell:chrome-state", (_event, state) => handler(state));
  },
});
