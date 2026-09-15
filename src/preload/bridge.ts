import { contextBridge, ipcRenderer } from "electron";
import {
  BRIDGE,
  IPC,
  type ShellTheme,
  type ShortcutName,
  type StoopBridge,
  type VoiceAction,
} from "../shared/bridge";

// Whether App settings is letting banners through, kept current here.
// contextBridge copies values into the page once, at load, so a field
// would go stale the moment the switch moved; a function is proxied and
// runs in this world, where the variable below is live.
let notificationsOn = fromArgs("--stoop-notifications=") !== "false";
ipcRenderer.on(IPC.stoopNotifications, (_: unknown, on: boolean) => {
  notificationsOn = on;
});

// Runs in every server page with contextIsolation on: the page sees only
// this object, never Node or ipcRenderer.
const stoop: StoopBridge = {
  bridge: BRIDGE,
  version: versionFromArgs(),
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
  theme: themeFromArgs(),
  onTheme(handler) {
    const listener = (_: unknown, theme: ShellTheme) => handler(theme);
    ipcRenderer.on(IPC.stoopTheme, listener);
    return () => ipcRenderer.removeListener(IPC.stoopTheme, listener);
  },
  setVoice(report) {
    ipcRenderer.send(IPC.setVoice, report);
  },
  onVoiceAction(handler) {
    const listener = (_: unknown, action: VoiceAction) => handler(action);
    ipcRenderer.on(IPC.voiceAction, listener);
    return () => ipcRenderer.removeListener(IPC.voiceAction, listener);
  },
  // Asked of main as the page loads rather than passed as an argument: a
  // view's arguments are fixed when it is made, and a page reloaded after
  // the switch moved would start from the old answer.
  dnd: ipcRenderer.sendSync(IPC.getDnd) === true,
  onDnd(handler) {
    const listener = (_: unknown, on: boolean) => handler(on);
    ipcRenderer.on(IPC.stoopDnd, listener);
    return () => ipcRenderer.removeListener(IPC.stoopDnd, listener);
  },
  notificationsAllowed: () => notificationsOn,
};

contextBridge.exposeInMainWorld("stoop", stoop);

// Main passes the app version and the theme as process arguments, the
// one channel a sandboxed preload can read before any IPC: the page's
// first paint needs the theme, and its inline stamp runs before any
// message could arrive.
function versionFromArgs(): string {
  return fromArgs("--stoop-desktop-version=") || "dev";
}

// The theme travels as URI-encoded JSON, so an argument never carries
// a space or a quote. Main always sends one; the fallback only keeps
// the shape if it did not.
function themeFromArgs(): ShellTheme {
  try {
    const theme = JSON.parse(
      decodeURIComponent(fromArgs("--stoop-theme=")),
    ) as ShellTheme;
    if (theme && typeof theme === "object" && theme.tokens) return theme;
  } catch {
    // Fall through.
  }
  return { scheme: "dark", tokens: {} };
}

function fromArgs(prefix: string): string {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
}
