import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME } from "../shared/themes";
import { loadSettings, type Settings, saveSettings } from "./settings";

const electron = vi.hoisted(() => ({
  userData: "",
  setLoginItemSettings: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: () => electron.userData,
    setLoginItemSettings: electron.setLoginItemSettings,
  },
}));

const DEFAULTS: Settings = {
  keepRunning: true,
  launchAtLogin: false,
  theme: DEFAULT_THEME,
  dnd: false,
  dndUntil: null,
  notifications: true,
  voiceCues: true,
};

const write = (raw: unknown) =>
  writeFileSync(
    join(electron.userData, "settings.json"),
    typeof raw === "string" ? raw : JSON.stringify(raw),
  );

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "stoop-settings-"));
  electron.userData = root;
  electron.setLoginItemSettings.mockClear();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("loadSettings", () => {
  it("is the defaults when nothing was saved", () => {
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it("is the defaults when the file is not JSON", () => {
    write("{oops");
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it("fills in what an older file leaves out", () => {
    write({ keepRunning: false });
    expect(loadSettings()).toEqual({ ...DEFAULTS, keepRunning: false });
  });

  it("replaces a theme it does not know with the default", () => {
    write({ theme: { mode: "theme", theme: "sepia" } });
    expect(loadSettings().theme).toEqual(DEFAULT_THEME);
    write({ theme: "dusk" });
    expect(loadSettings().theme).toEqual(DEFAULT_THEME);
  });

  it("keeps do not disturb that has not ended", () => {
    const until = Date.now() + 60_000;
    write({ dnd: true, dndUntil: until });
    expect(loadSettings()).toMatchObject({ dnd: true, dndUntil: until });
  });

  it("keeps do not disturb set for good", () => {
    write({ dnd: true, dndUntil: null });
    expect(loadSettings()).toMatchObject({ dnd: true, dndUntil: null });
  });

  it("loads do not disturb that ended while the app was closed as off", () => {
    write({ dnd: true, dndUntil: Date.now() - 1 });
    expect(loadSettings()).toMatchObject({ dnd: false, dndUntil: null });
  });

  it("clears a leftover end when do not disturb is off", () => {
    write({ dnd: false, dndUntil: Date.now() + 60_000 });
    expect(loadSettings()).toMatchObject({ dnd: false, dndUntil: null });
  });
});

describe("saveSettings", () => {
  it("writes what loadSettings reads back", () => {
    const settings: Settings = {
      ...DEFAULTS,
      keepRunning: false,
      launchAtLogin: true,
      theme: { ...DEFAULT_THEME, mode: "system", light: "newsprint" },
      notifications: false,
    };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
    expect(
      JSON.parse(readFileSync(join(root, "settings.json"), "utf8")),
    ).toEqual(settings);
  });

  it("makes the data directory when it is not there yet", () => {
    electron.userData = join(root, "nested", "deeper");
    saveSettings(DEFAULTS);
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it("tells the OS whether to launch at login", () => {
    saveSettings({ ...DEFAULTS, launchAtLogin: true });
    expect(electron.setLoginItemSettings).toHaveBeenLastCalledWith({
      openAtLogin: true,
    });
    saveSettings({ ...DEFAULTS, launchAtLogin: false });
    expect(electron.setLoginItemSettings).toHaveBeenLastCalledWith({
      openAtLogin: false,
    });
  });
});
