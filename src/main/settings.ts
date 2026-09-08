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
}

const DEFAULTS: Settings = {
  keepRunning: true,
  launchAtLogin: false,
  theme: DEFAULT_THEME,
};
const file = () => join(app.getPath("userData"), "settings.json");

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8")) as Partial<Settings>;
    return { ...DEFAULTS, ...raw, theme: themePreference(raw.theme) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings) {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(file(), JSON.stringify(settings, null, 2));
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
}
