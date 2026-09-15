import { contextBridge, ipcRenderer } from "electron";
import {
  BRIDGE,
  IPC,
  type PresenceChoice,
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
  status: statusFromArgs(),
  onStatus(handler) {
    const listener = (_: unknown, status: PresenceChoice) => handler(status);
    ipcRenderer.on(IPC.stoopStatus, listener);
    return () => ipcRenderer.removeListener(IPC.stoopStatus, listener);
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

// Main always sends one. Anything else is a shell too old to have an
// opinion or an argument that did not arrive, and present is the safer
// guess than reporting someone absent who is sitting right there.
function statusFromArgs(): PresenceChoice {
  const said = fromArgs("--stoop-status=");
  return said === "away" || said === "dnd" ? said : "online";
}

function fromArgs(prefix: string): string {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "";
}
