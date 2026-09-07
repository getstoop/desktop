// The window.stoop contract, version 1. The server repo declares the same
// shape in web/src/api/platform.ts and publishes the level it speaks from
// GET /version; the two move together. docs/architecture/desktop.md there.

export const BRIDGE = 1;

export type ShortcutName = "pushToTalk";

export interface StoopBridge {
  bridge: number;
  version: string;
  platform: "darwin" | "win32" | "linux";
  setBadge(count: number): void;
  onShortcut(name: ShortcutName, handler: (down: boolean) => void): () => void;
}

// IPC channel names, one place so main and preload cannot drift.
// preload/shell.ts repeats its names as literals; see the note there.
export const IPC = {
  setBadge: "stoop:set-badge",
  shortcut: "stoop:shortcut",
  probe: "shell:probe",
  addServer: "shell:add-server",
  removeServer: "shell:remove-server",
  retryServer: "shell:retry-server",
  openMenu: "shell:open-menu",
  windowAction: "shell:window-action",
  openExternal: "shell:open-external",
  chromeState: "shell:chrome-state",
  updateApp: "shell:update-app",
  getSettings: "shell:get-settings",
  setSettings: "shell:set-settings",
  showPage: "shell:show-page",
} as const;

// What the settings page shows, pulled from main on load and after a
// change.
export interface SettingsView {
  keepRunning: boolean;
  launchAtLogin: boolean;
  version: string;
  platform: string;
  // The server to go back to, by name, when there is one.
  front: string | null;
  servers: { id: string; name: string; url: string; version: string }[];
}

// What the title strip shows: pushed from main whenever it changes.
export interface ChromeState {
  name: string;
  // Another server has unread activity.
  dot: boolean;
  // The front server's theme colour, and text that reads on it.
  color: string;
  symbol: string;
  platform: "darwin" | "win32" | "linux" | string;
  // The front server speaks a newer bridge than this app: offer an update.
  newer: boolean;
}

// The answer to "is this a Stoop server I can open?".
export type Probe =
  | { ok: true; version: string; bridge: number; name: string }
  | { ok: false; kind: "unreachable" | "not-stoop"; detail: string };
