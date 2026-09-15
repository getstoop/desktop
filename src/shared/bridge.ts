// The window.stoop contract, version 1. The server repo declares the same
// shape in web/src/api/platform.ts and publishes the level it speaks from
// GET /version; the two move together. docs/architecture/desktop.md there.

import type { ThemePreference } from "./themes";

export const BRIDGE = 3;

export type ShortcutName = "pushToTalk";

// Bridge 3. How this side names a status. Strings rather than the
// realtime enum: the shell has no protos, and the page maps them.
export type PresenceChoice = "online" | "away" | "dnd";

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
  // Bridge 3. What the page captures, drawn in the strip and the tray;
  // null once out of voice. The page hides its own rail pill when this
  // member exists.
  setVoice(report: VoiceReport | null): void;
  // Bridge 3. The strip or tray asks the page holding voice to act.
  onVoiceAction(handler: (action: VoiceAction) => void): () => void;
  // Bridge 3. The status the app keeps for every server it holds: one
  // choice, and Away decided from the computer rather than from whichever
  // page happens to be in front. A page that is behind sees no input at
  // all, so it cannot tell "gone" from "reading something else".
  status: PresenceChoice;
  onStatus(handler: (status: PresenceChoice) => void): () => void;
  // Bridge 3. Whether App settings is letting desktop banners through,
  // asked at the moment one would fire. A function because contextBridge
  // copies values across once, at load, and this one changes while the
  // page is open.
  notificationsAllowed(): boolean;
}

export type VoiceKind =
  | "joining"
  | "error"
  | "muted"
  | "mic"
  | "camera"
  | "screen";

// The page's capture state with the names already resolved: the shell
// has no queries of its own. web/src/api/platform.ts declares the same.
export interface VoiceReport {
  kind: VoiceKind;
  mic: boolean;
  camera: boolean;
  screen: boolean;
  channel: string;
  space: string;
}

// What the strip, the voice popover and the tray ask of the page holding
// voice. Each is a state, not a toggle. "show" brings that server forward
// and has its page open the channel; nothing else switches servers.
export type VoiceAction =
  | "show"
  | "mute"
  | "unmute"
  | "camera-on"
  | "camera-off"
  | "stop-screen";

export const VOICE_ACTIONS: readonly VoiceAction[] = [
  "show",
  "mute",
  "unmute",
  "camera-on",
  "camera-off",
  "stop-screen",
];

// The indicator as the strip draws it: the report, and where to say it is.
export interface ChromeVoice {
  kind: VoiceKind;
  mic: boolean;
  camera: boolean;
  screen: boolean;
  channel: string;
  where: string;
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
  stoopStatus: "stoop:status",
  stoopNotifications: "stoop:notifications",
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
  setVoice: "stoop:set-voice",
  voiceAction: "stoop:voice-action",
  voiceClick: "shell:voice-click",
  voicePanel: "shell:voice-panel",
  voicePanelAction: "shell:voice-panel-action",
  closeVoicePanel: "shell:close-voice-panel",
  testNotification: "shell:test-notification",
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
  // The status as chosen, not as reported: the settings page shows what
  // the person picked, while idleness may be reporting Away on top of it.
  status: PresenceChoice;
  notifications: boolean;
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
  // The theme's canvas, text that reads on it, and the accent a state is
  // painted in — the strip has to tell "App settings is open" apart from
  // "the pointer is here", and grey cannot do both.
  color: string;
  symbol: string;
  accent: string;
  platform: "darwin" | "win32" | "linux" | string;
  // The front server speaks a newer bridge than this app: offer an update.
  newer: boolean;
  // App settings is the page in front, so the strip's gear is lit and
  // clicking it goes back rather than opening what is already open.
  settings: boolean;
  // Voice held by any server, drawn centred in the strip; null outside
  // voice. ok and danger are the theme's, for its colours.
  voice: ChromeVoice | null;
  ok: string;
  danger: string;
}

// The answer to "is this a Stoop server I can open?".
export type Probe =
  | { ok: true; version: string; bridge: number; name: string }
  | { ok: false; kind: "unreachable" | "not-stoop"; detail: string };
