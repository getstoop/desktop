import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { PresenceChoice } from "../shared/bridge";
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
  // How the person appears, and whether banners are allowed through, on
  // every server the app holds. As chosen — idleness reports Away on top
  // of this without changing it, so quitting while idle comes back to
  // what was picked rather than to Away.
  status: PresenceChoice;
  notifications: boolean;
}

const DEFAULTS: Settings = {
  keepRunning: true,
  launchAtLogin: false,
  theme: DEFAULT_THEME,
  status: "online",
  notifications: true,
};
const file = () => join(app.getPath("userData"), "settings.json");

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8")) as Partial<Settings>;
    return {
      ...DEFAULTS,
      ...raw,
      theme: themePreference(raw.theme),
      status: presenceChoice(raw.status),
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

// A hand-edited or stale file cannot leave someone reporting something
// the servers have no name for.
export function presenceChoice(value: unknown): PresenceChoice {
  return value === "away" || value === "dnd" || value === "online"
    ? value
    : DEFAULTS.status;
}
