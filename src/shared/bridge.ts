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
  windowAction: "shell:window-action",
  openExternal: "shell:open-external",
  chromeState: "shell:chrome-state",
  updateApp: "shell:update-app",
  getSettings: "shell:get-settings",
  setSettings: "shell:set-settings",
  showPage: "shell:show-page",
  pickerSources: "shell:picker-sources",
  pickerChoice: "shell:picker-choice",
  getTheme: "shell:get-theme",
  theme: "shell:theme",
  openSwitcher: "shell:open-switcher",
  switcherRows: "shell:switcher-rows",
  chooseServer: "shell:choose-server",
  closeSwitcher: "shell:close-switcher",
} as const;

// The colours the shell's own pages paint with: the web app's own tokens
// where main could read them, derived from theme-color where it could
// not. shell.css carries the same names as literals, so a page renders
// before this arrives.
export interface Palette {
  canvas: string;
  surface: string;
  panel: string;
  raised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  danger: string;
  warn: string;
  scheme: "dark" | "light";
}

// One server as the switcher panel draws it. Everything here is already
// known to main; nothing is asked of the server.
export interface ServerRow {
  id: string;
  name: string;
  host: string;
  badge: number;
  state: "ok" | "unreachable" | "too-old" | "not-stoop";
  // A colour from the server's origin, not from anyone's theme.
  tile: string;
  tileText: string;
  current: boolean;
  accelerator: string;
}

// What the switcher panel is given when it opens: the rows, and where to
// sit under the strip button.
export interface SwitcherView {
  rows: ServerRow[];
  left: number;
}

// One thing the screen picker can offer.
export interface PickerSource {
  id: string;
  name: string;
  kind: "screen" | "window";
  thumbnail: string; // data URL, or empty
  icon: string; // data URL, or empty
}

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
