import { join } from "node:path";
import { BrowserWindow, shell } from "electron";

// Two preloads: the app's own page gets window.shell; a server page gets
// window.stoop and nothing else. A window switches preload when it
// switches from one to the other, which is why loading a server replaces
// the window's webContents preferences rather than navigating in place.

const shellPreload = join(__dirname, "../preload/shell.js");
const bridgePreload = join(__dirname, "../preload/bridge.js");

// message, when given, is shown on the page: why the last server did
// not open.
export function createWindow(message?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    show: false,
    webPreferences: {
      preload: shellPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once("ready-to-show", () => win.show());
  // Anything that wants a new window goes to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  const query = message ? `?message=${encodeURIComponent(message)}` : "";
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL + query);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"), {
      search: query,
    });
  }
  return win;
}

// Loads a server's web app into a fresh window that carries the bridge
// preload, and closes the page that asked.
export function openServer(from: BrowserWindow, url: string) {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return;
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return;
  const bounds = from.getBounds();
  const win = new BrowserWindow({
    ...bounds,
    show: false,
    webPreferences: {
      preload: bridgePreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once("ready-to-show", () => {
    win.show();
    from.close();
  });
  // A server that cannot be reached, or refuses the load, goes back to
  // the add-server page with the reason instead of a blank window.
  win.webContents.on(
    "did-fail-load",
    (_event, code, description, failedUrl, isMainFrame) => {
      if (!isMainFrame || code === -3) return; // -3: aborted by a newer load
      createWindow(`Could not open ${failedUrl}: ${description} (${code})`);
      win.close();
      from.close();
    },
  );
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  // Stay on the server: a link off its origin opens outside.
  win.webContents.on("will-navigate", (event, next) => {
    if (new URL(next).origin !== target.origin) {
      event.preventDefault();
      void shell.openExternal(next);
    }
  });
  void win.loadURL(target.toString());
}
