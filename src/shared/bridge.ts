// The window.stoop contract, version 1. The server repo declares the same
// shape in web/src/api/platform.ts and publishes the level it speaks from
// GET /version; the two move together. docs/architecture/desktop.md there.

import type { ThemePreference } from "./themes";

export const BRIDGE = 5;

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
  // Bridge 3. What the page captures, drawn in the strip and the tray;
  // null once out of voice. The page hides its own rail pill when this
  // member exists.
  setVoice(report: VoiceReport | null): void;
  // Bridge 3. The strip or tray asks the page holding voice to act.
  onVoiceAction(handler: (action: VoiceAction) => void): () => void;
  // Bridge 3. The app's one do not disturb switch, for every server it
  // holds. The page sets its own server to match: to on whenever this is
  // on, and to off only when the switch is turned off, never on load, so
  // opening the app can't clear do not disturb set from another device.
  dnd: DndSwitch;
  onDnd(handler: (dnd: DndSwitch) => void): () => void;
  // Bridge 3. Whether App settings is letting desktop banners through,
  // asked at the moment one would fire. A function because contextBridge
  // copies values across once, at load, and this one changes while the
  // page is open.
  notificationsAllowed(): boolean;
  // Bridge 5. Whether App settings is letting the voice room cues play —
  // the join and leave tones — asked at the moment one would. A function
  // for the same reason as notificationsAllowed: contextBridge copies
  // values once, at load, and the switch moves while a page is open.
  voiceCuesAllowed(): boolean;
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
  // Bridge 4. False from a page too old to say.
  deafened: boolean;
  channel: string;
  space: string;
}

// What the strip, the voice popover and the tray ask of the page holding
// voice. Each is a state, not a toggle. "show" brings that server forward
// and has its page open the channel; nothing else switches servers.
// "leave" keeps one call at a time: voice started on another server.
export type VoiceAction =
  | "show"
  | "mute"
  | "unmute"
  // Bridge 4.
  | "deafen"
  | "undeafen"
  | "camera-on"
  | "camera-off"
  | "stop-screen"
  | "leave";

export const VOICE_ACTIONS: readonly VoiceAction[] = [
  "show",
  "mute",
  "unmute",
  "deafen",
  "undeafen",
  "camera-on",
  "camera-off",
  "stop-screen",
  "leave",
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
  stoopDnd: "stoop:dnd",
  getDnd: "stoop:get-dnd",
  stoopNotifications: "stoop:notifications",
  stoopVoiceCues: "stoop:voice-cues",
  probe: "shell:probe",
  addServer: "shell:add-server",
  removeServer: "shell:remove-server",
  retryServer: "shell:retry-server",
  windowAction: "shell:window-action",
  openExternal: "shell:open-external",
  openKeyAccess: "shell:open-key-access",
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
  updateState: "shell:update-state",
  checkForUpdates: "shell:check-for-updates",
  installUpdate: "shell:install-update",
} as const;

// Where a new version is announced, for the pages that point there.
export const RELEASES_URL = "https://github.com/getstoop/desktop/releases";

// Where the app stands with its next version, as main/updates.ts keeps it
// and About, the strip and the tray show it.
export type UpdateState =
  // A build run from a checkout: it does not update itself.
  | { kind: "off" }
  // Nothing known to be newer. checkedAt is when that was last confirmed,
  // in epoch ms, or null before a check has answered.
  | { kind: "idle"; checkedAt: number | null }
  | { kind: "checking" }
  | { kind: "downloading"; version: string; percent: number }
  // Downloaded, and installs when the app next quits: a restart brings
  // the new version up now.
  | { kind: "ready"; version: string }
  | { kind: "error"; detail: string };

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

// The do not disturb switch as a server page gets it: on or off, and when
// it ends (epoch ms, or null for never). One past its end is off.
export interface DndSwitch {
  on: boolean;
  until: number | null;
}

// What the settings page shows, pulled from main on load and after a
// change.
export interface SettingsView {
  keepRunning: boolean;
  launchAtLogin: boolean;
  theme: ThemePreference;
  dnd: boolean;
  dndUntil: number | null;
  notifications: boolean;
  voiceCues: boolean;
  pushToTalk: boolean;
  // Whether the keys can be read: Input Monitoring on macOS, an X display
  // on Linux. Push to talk listens only when this is "granted".
  keyAccess: "granted" | "denied" | "unknown" | "unsupported";
  version: string;
  platform: string;
  update: UpdateState;
  // Installed from the .deb, so installing an update asks for the
  // password.
  deb: boolean;
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
  // A new version downloaded and waiting on a restart, or null.
  update: string | null;
  // App settings is the page in front, so the strip's gear is lit and
  // clicking it goes back rather than opening what is already open.
  settings: boolean;
  // Voice held by any server, drawn centred in the strip; null outside
  // voice. ok and danger are the theme's, for its colours.
  voice: ChromeVoice | null;
  ok: string;
  danger: string;
  // A few seconds of words after something happened out of sight, such
  // as leaving voice on another server; empty otherwise.
  notice: string;
}

// The answer to "is this a Stoop server I can open?".
export type Probe =
  | { ok: true; version: string; bridge: number; name: string }
  | { ok: false; kind: "unreachable" | "not-stoop"; detail: string };
