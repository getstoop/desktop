import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import {
  DEFAULT_THEME,
  type ThemePreference,
  themePreference,
} from "../shared/themes";

// Settings that belong to this app on this computer. Nothing about the
// person or their servers lives here.

export interface Settings {
  // Closing the window leaves the app running in the tray.
  keepRunning: boolean;
  launchAtLogin: boolean;
  // How the app looks: the shell's choice, worn by its own pages and
  // handed to every server page.
  theme: ThemePreference;
  // Do not disturb for every server the app holds: each server stores its
  // own, and the app sets them all. While on, no banners come through.
  dnd: boolean;
  // When do not disturb ends, in epoch ms, or null for never.
  dndUntil: number | null;
  // Whether banners are allowed through at all, from any server.
  notifications: boolean;
  // A soft tone when someone joins or leaves the call you're in, on any
  // server here. Off silences it on all of them; each page asks the app
  // at the moment a cue would play.
  voiceCues: boolean;
}

const DEFAULTS: Settings = {
  keepRunning: true,
  launchAtLogin: false,
  theme: DEFAULT_THEME,
  dnd: false,
  dndUntil: null,
  notifications: true,
  voiceCues: true,
};
const file = () => join(app.getPath("userData"), "settings.json");

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8")) as Partial<Settings>;
    const until = typeof raw.dndUntil === "number" ? raw.dndUntil : null;
    // One that ended while the app was closed loads as off.
    const dnd = raw.dnd === true && (until === null || until > Date.now());
    return {
      ...DEFAULTS,
      ...raw,
      theme: themePreference(raw.theme),
      dnd,
      dndUntil: dnd ? until : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings) {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(file(), JSON.stringify(settings, null, 2));
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
}
