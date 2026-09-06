import { join } from "node:path";
import { BrowserWindow, shell } from "electron";

// No native title bar: the page draws that strip in its own theme and
// the OS lays its window controls over it (the traffic lights on macOS,
// the overlay on Windows and Linux). The overlay's colours follow the
// page's theme-color, which the web app keeps in step with its theme.
const frame = {
  titleBarStyle: "hidden" as const,
  titleBarOverlay: { color: "#141517", symbolColor: "#e6e7ea", height: 32 },
};

function followThemeColor(win: BrowserWindow) {
  win.webContents.on("did-change-theme-color", (_event, color) => {
    if (!color) return;
    win.setBackgroundColor(color);
    if (process.platform !== "darwin") {
      win.setTitleBarOverlay({ color, symbolColor: symbolFor(color) });
    }
  });
}

// Light text on a dark colour, dark text on a light one.
function symbolFor(hex: string): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1f1d1a" : "#e6e7ea";
}

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
    ...frame,
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
    ...frame,
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
  followThemeColor(win);
  // Stay on the server: a link off its origin opens outside.
  win.webContents.on("will-navigate", (event, next) => {
    if (new URL(next).origin !== target.origin) {
      event.preventDefault();
      void shell.openExternal(next);
    }
  });
  void win.loadURL(target.toString());
}
