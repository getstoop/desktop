import { Menu, type MenuItemConstructorOptions, Tray } from "electron";
import { loadSettings, type Settings, saveSettings } from "./settings";
import { trayIcon } from "./trayIcon";

// The menu bar / tray icon: the unread total beside it, and a menu with
// what voice is capturing, the servers, the two app settings that have no
// other home yet, and Quit. What it lists comes from the window through
// `source`.

export interface TraySource {
  serverItems(): MenuItemConstructorOptions[];
  // Voice's live items, or none outside voice.
  voiceItems(): MenuItemConstructorOptions[];
  // What voice is capturing, in words, or "" outside voice.
  voiceTooltip(): string;
  unreadTotal(): number;
  showWindow(): void;
  showAddServer(): void;
  showSettings(): void;
}

export class AppTray {
  private tray: Tray;
  settings: Settings = loadSettings();

  constructor(private source: TraySource) {
    this.tray = new Tray(trayIcon());
    this.tray.setToolTip("Stoop");
    this.tray.on("click", () => this.source.showWindow());
    this.refresh();
  }

  refresh() {
    const total = this.source.unreadTotal();
    // macOS shows text beside the icon; elsewhere the tooltip carries it.
    if (process.platform === "darwin")
      this.tray.setTitle(total ? String(total) : "");
    const parts = ["Stoop", this.source.voiceTooltip()];
    if (total) parts.push(`${total} unread`);
    this.tray.setToolTip(parts.filter(Boolean).join(" · "));
    const voice = this.source.voiceItems();
    const items: MenuItemConstructorOptions[] = [
      ...(voice.length
        ? [...voice, { type: "separator" } as MenuItemConstructorOptions]
        : []),
      ...this.source.serverItems().map((item) => ({
        ...item,
        click: () => {
          this.source.showWindow();
          (item.click as (() => void) | undefined)?.();
        },
      })),
      { type: "separator" },
      { label: "Add a server…", click: () => this.source.showAddServer() },
      { label: "Settings…", click: () => this.source.showSettings() },
      { type: "separator" },
      {
        label: "Keep running when the window closes",
        type: "checkbox",
        checked: this.settings.keepRunning,
        click: (item) => this.update({ keepRunning: item.checked }),
      },
      {
        label: "Launch at login",
        type: "checkbox",
        checked: this.settings.launchAtLogin,
        click: (item) => this.update({ launchAtLogin: item.checked }),
      },
      { type: "separator" },
      { label: "Quit Stoop", role: "quit" },
    ];
    this.tray.setContextMenu(Menu.buildFromTemplate(items));
  }

  update(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    this.refresh();
  }

  destroy() {
    this.tray.destroy();
  }
}

// Set by before-quit so a close during quit is a real close.
let quitting = false;
export function markQuitting() {
  quitting = true;
}

// Whether a window close should hide instead of closing, given the
// setting and whether the app is on its way out.
export function hideOnClose(settings: Settings): boolean {
  return settings.keepRunning && !quitting;
}
