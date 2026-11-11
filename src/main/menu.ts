import type { MenuItemConstructorOptions } from "electron";
import type { VoiceAction, VoiceReport } from "../shared/bridge";
import type { Settings } from "./settings";
import { ACCELERATORS, serverAccelerator } from "./shortcuts";
import { voiceMenuItems } from "./voice";
import { zoomPercent, zoomStep } from "./zoom";

// The app menu and the server list the tray shares with it, as
// templates: what they say is read from the window, what they do is
// handed back to it.

export interface MenuServer {
  id: string;
  name: string;
  badge: number;
}

// The servers, one radio item each, the one in front checked.
export function serverMenuItems(
  servers: MenuServer[],
  front: string | null,
  show: (id: string) => void,
): MenuItemConstructorOptions[] {
  return servers.map((server, i) => ({
    label: server.badge ? `${server.name}  (${server.badge})` : server.name,
    type: "radio",
    checked: server.id === front,
    accelerator: serverAccelerator(i),
    click: () => show(server.id),
  }));
}

function zoomMenuItems(
  zoom: number,
  set: (level: number) => void,
): MenuItemConstructorOptions[] {
  const step = (direction: 1 | -1) => () => set(zoomStep(zoom, direction));
  return [
    // Where the zoom stands, as a line to read and not to click.
    { label: `Zoom: ${zoomPercent(zoom)}%`, enabled: false },
    {
      label: "Actual Size",
      accelerator: ACCELERATORS.zoomReset,
      click: () => set(0),
    },
    { label: "Zoom In", accelerator: ACCELERATORS.zoomIn, click: step(1) },
    {
      label: "Zoom In",
      accelerator: ACCELERATORS.zoomInUnshifted,
      visible: false,
      acceleratorWorksWhenHidden: true,
      click: step(1),
    },
    { label: "Zoom Out", accelerator: ACCELERATORS.zoomOut, click: step(-1) },
  ];
}

export interface AppMenu {
  servers: MenuItemConstructorOptions[];
  // The call's last report; null outside voice.
  voice: VoiceReport | null;
  settings: Settings;
  showPage(page: "add" | "settings"): void;
  voiceAction(action: VoiceAction): void;
  updateSettings(patch: Partial<Settings>): void;
  setZoom(level: number): void;
}

export function appMenu(menu: AppMenu): MenuItemConstructorOptions[] {
  const isMac = process.platform === "darwin";
  return [
    ...(isMac ? [{ role: "appMenu" as const }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "Servers",
      submenu: [
        ...menu.servers,
        { type: "separator" },
        { label: "Add a server…", click: () => menu.showPage("add") },
        {
          label: "App settings…",
          accelerator: ACCELERATORS.settings,
          click: () => menu.showPage("settings"),
        },
      ],
    },
    {
      label: "Voice",
      submenu: [
        ...voiceMenuItems(menu.voice, (action) => menu.voiceAction(action)),
        { type: "separator" },
        // The App setting, mirrored where a call's other controls are,
        // so it can be flipped mid-call without opening settings.
        {
          label: "Join and leave sounds",
          type: "checkbox",
          checked: menu.settings.voiceCues,
          click: (item) => menu.updateSettings({ voiceCues: item.checked }),
        },
        {
          label: "Volume keys from any app",
          type: "checkbox",
          checked: menu.settings.volumeKeys,
          click: (item) => menu.updateSettings({ volumeKeys: item.checked }),
        },
      ],
    },
    {
      // The stock View menu, with the app's zoom in place of the
      // per-page one.
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        ...zoomMenuItems(menu.settings.zoom, menu.setZoom),
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ];
}
