import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME } from "../shared/themes";
import type { Settings } from "./settings";
import { hideOnClose, markQuitting } from "./tray";

vi.mock("electron", () => ({
  app: {},
  nativeImage: {},
  Menu: {},
  Tray: class {},
}));

const settings = (keepRunning: boolean): Settings => ({
  keepRunning,
  launchAtLogin: false,
  theme: DEFAULT_THEME,
  dnd: false,
  dndUntil: null,
  notifications: true,
  voiceCues: true,
});

describe("hideOnClose", () => {
  it("follows the setting while the app is running", () => {
    expect(hideOnClose(settings(true))).toBe(true);
    expect(hideOnClose(settings(false))).toBe(false);
  });

  it("is a real close once the app is quitting", () => {
    markQuitting();
    expect(hideOnClose(settings(true))).toBe(false);
    expect(hideOnClose(settings(false))).toBe(false);
  });
});
