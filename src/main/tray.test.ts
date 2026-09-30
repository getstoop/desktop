import type { MenuItemConstructorOptions } from "electron";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME } from "../shared/themes";
import type { Settings } from "./settings";
import { AppTray, hideOnClose, markQuitting, type TraySource } from "./tray";

// Enough of Electron for a tray to be built: the menu template it hands
// over is kept, and that is what the tests read.
const built = vi.hoisted(() => ({ menu: [] as MenuItemConstructorOptions[] }));

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: () => "",
    // No settings.json there, so the defaults load.
    getPath: () => "/nonexistent",
    setLoginItemSettings: () => {},
  },
  nativeImage: { createFromPath: () => ({ setTemplateImage() {} }) },
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      built.menu = template;
      return template;
    },
  },
  Tray: class {
    on() {}
    setToolTip() {}
    setTitle() {}
    setContextMenu() {}
    destroy() {}
  },
}));

const source = (over: Partial<TraySource> = {}): TraySource => ({
  updateItems: () => [],
  serverItems: () => [{ label: "Home" }],
  voiceItems: () => [],
  voiceTooltip: () => "",
  unreadTotal: () => 0,
  showWindow: () => {},
  showAddServer: () => {},
  showSettings: () => {},
  ...over,
});

const labels = () => built.menu.map((item) => item.label ?? item.type);

describe("AppTray", () => {
  it("leads with the restart once an update is downloaded", () => {
    const install = vi.fn();
    new AppTray(
      source({
        updateItems: () => [
          { label: "Restart to update to Stoop 0.2.0", click: install },
        ],
      }),
    );
    expect(labels().slice(0, 3)).toEqual([
      "Restart to update to Stoop 0.2.0",
      "separator",
      "Home",
    ]);
    (built.menu[0].click as () => void)();
    expect(install).toHaveBeenCalledTimes(1);
  });

  it("says nothing about updates until there is one", () => {
    new AppTray(source());
    expect(labels()[0]).toBe("Home");
    expect(labels().some((l) => /update/i.test(String(l)))).toBe(false);
  });

  it("puts the update above voice", () => {
    new AppTray(
      source({
        updateItems: () => [{ label: "Restart to update to Stoop 0.2.0" }],
        voiceItems: () => [{ label: "Mute" }],
      }),
    );
    expect(labels().slice(0, 4)).toEqual([
      "Restart to update to Stoop 0.2.0",
      "separator",
      "Mute",
      "separator",
    ]);
  });
});

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
