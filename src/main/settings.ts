import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

// Settings that belong to this app on this computer. Nothing about the
// person or their servers lives here.

export interface Settings {
  // Closing the window leaves the app running in the tray.
  keepRunning: boolean;
  launchAtLogin: boolean;
}

const DEFAULTS: Settings = { keepRunning: true, launchAtLogin: false };
const file = () => join(app.getPath("userData"), "settings.json");

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(file(), "utf8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings) {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(file(), JSON.stringify(settings, null, 2));
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
}
