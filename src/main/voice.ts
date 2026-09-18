import type { MenuItemConstructorOptions } from "electron";
import type { VoiceAction, VoiceKind, VoiceReport } from "../shared/bridge";
import { ACCELERATORS } from "./shortcuts";

// The live indicator's shell side: what a server page says it captures,
// checked on the way in, and the tray's words for it.

const KINDS: readonly VoiceKind[] = [
  "joining",
  "error",
  "muted",
  "mic",
  "camera",
  "screen",
];

// A page is not trusted to send a well-formed report; anything that is
// not one reads as "not in voice".
export function parseVoiceReport(raw: unknown): VoiceReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!KINDS.includes(r.kind as VoiceKind)) return null;
  return {
    kind: r.kind as VoiceKind,
    mic: r.mic === true,
    camera: r.camera === true,
    screen: r.screen === true,
    deafened: r.deafened === true,
    channel: typeof r.channel === "string" ? r.channel : "…",
    space: typeof r.space === "string" ? r.space : "…",
  };
}

export function voiceLabel(kind: VoiceKind): string {
  switch (kind) {
    case "joining":
      return "Joining voice";
    case "error":
      return "Couldn't join voice";
    case "muted":
      return "In voice, muted";
    case "mic":
      return "Microphone live";
    case "camera":
      return "Camera on";
    case "screen":
      return "Sharing your screen";
  }
}

// Only what is live gets an item; a muted mic adds nothing to act on.
export function trayVoiceItems(
  report: VoiceReport,
  where: string,
  act: (action: VoiceAction) => void,
): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [
    { label: `In voice · ${where}`, enabled: false },
  ];
  if (report.screen)
    items.push({
      label: "Stop sharing screen",
      click: () => act("stop-screen"),
    });
  if (report.camera)
    items.push({ label: "Turn camera off", click: () => act("camera-off") });
  if (report.mic)
    items.push({ label: "Mute microphone", click: () => act("mute") });
  items.push({ label: "Show channel", click: () => act("show") });
  return items;
}

// The app menu's Voice items. Each asks for a state, read off the last
// report; out of voice they are greyed and the keys do nothing.
export function voiceMenuItems(
  report: VoiceReport | null,
  act: (action: VoiceAction) => void,
): MenuItemConstructorOptions[] {
  return [
    {
      label: report && !report.mic ? "Unmute" : "Mute",
      accelerator: ACCELERATORS.toggleMute,
      enabled: !!report,
      click: () => act(report?.mic ? "mute" : "unmute"),
    },
    {
      label: report?.deafened ? "Undeafen" : "Deafen",
      accelerator: ACCELERATORS.toggleDeafen,
      enabled: !!report,
      click: () => act(report?.deafened ? "undeafen" : "deafen"),
    },
  ];
}
