// The window.stoop contract, version 1. The server repo declares the same
// shape in web/src/api/platform.ts and publishes the level it speaks from
// GET /version; the two move together. docs/architecture/desktop.md there.

import type { ThemePreference } from "./themes";

export const BRIDGE = 2;

export type ShortcutName = "pushToTalk";

export interface StoopBridge {
  bridge: number;
  version: string;
  platform: "darwin" | "win32" | "linux";
  setBadge(count: number): void;
  onShortcut(name: ShortcutName, handler: (down: boolean) => void): () => void;
  // Bridge 2. The theme the shell wears, whole: the page paints from
  // the tokens and hides its own picker.
  theme: ShellTheme;
  onTheme(handler: (theme: ShellTheme) => void): () => void;
}

// The shape of a theme, as it crosses the bridge: no name, only what
// it is made of. tokens is keyed by CSS custom property name (--canvas,
// --text, …), the names web/src/themes.css defines; a page applies
// them as they are.
export interface ShellTheme {
  scheme: "dark" | "light";
  tokens: Record<string, string>;
}

// IPC channel names, one place so main and preload cannot drift.
// preload/shell.ts repeats its names as literals; see the note there.
export const IPC = {
  setBadge: "stoop:set-badge",
  shortcut: "stoop:shortcut",
  stoopTheme: "stoop:theme",
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

// One theme's tokens, the active row of shared/themes.ts: what the
// shell's own pages paint with, and what a server page is handed.
// shell.css carries the colours as literals, so a page renders before
// this arrives.
export interface Palette {
  canvas: string;
  surface: string;
  panel: string;
  raised: string;
  hover: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  ok: string;
  warn: string;
  danger: string;
  shadow: string;
  scrim: string;
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
  theme: ThemePreference;
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
  // The theme's canvas, and text that reads on it.
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
