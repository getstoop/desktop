import type { MenuItemConstructorOptions } from "electron";
import { describe, expect, it, vi } from "vitest";
import type { VoiceKind, VoiceReport } from "../shared/bridge";
import { ACCELERATORS } from "./shortcuts";
import {
  parseVoiceReport,
  trayVoiceItems,
  voiceLabel,
  voiceMenuItems,
} from "./voice";

const report = (patch: Partial<VoiceReport> = {}): VoiceReport => ({
  kind: "mic",
  mic: true,
  camera: false,
  screen: false,
  deafened: false,
  channel: "general",
  space: "The Stoop",
  ...patch,
});

// A menu item's click, called the way the tray calls it.
const click = (item: MenuItemConstructorOptions) =>
  (item.click as (() => void) | undefined)?.();

describe("parseVoiceReport", () => {
  it("passes a well-formed report through", () => {
    expect(parseVoiceReport(report())).toEqual(report());
  });

  it("reads anything that is not an object as out of voice", () => {
    expect(parseVoiceReport(null)).toBeNull();
    expect(parseVoiceReport(undefined)).toBeNull();
    expect(parseVoiceReport("mic")).toBeNull();
    expect(parseVoiceReport(7)).toBeNull();
  });

  it("reads a report with an unknown or missing kind as out of voice", () => {
    expect(parseVoiceReport({ ...report(), kind: "dancing" })).toBeNull();
    expect(parseVoiceReport({ mic: true })).toBeNull();
  });

  it("takes only true as true, and fills in what is missing", () => {
    expect(
      parseVoiceReport({ kind: "camera", mic: "yes", camera: 1, screen: true }),
    ).toEqual({
      kind: "camera",
      mic: false,
      camera: false,
      screen: true,
      deafened: false,
      channel: "…",
      space: "…",
    });
  });

  it("drops fields it does not know", () => {
    const parsed = parseVoiceReport({ ...report(), extra: "x" });
    expect(parsed).not.toHaveProperty("extra");
  });
});

describe("voiceLabel", () => {
  it.each<[VoiceKind, string]>([
    ["joining", "Joining voice"],
    ["error", "Couldn't join voice"],
    ["muted", "In voice, muted"],
    ["mic", "Microphone live"],
    ["camera", "Camera on"],
    ["screen", "Sharing your screen"],
  ])("says %s as %j", (kind, label) => {
    expect(voiceLabel(kind)).toBe(label);
  });
});

describe("trayVoiceItems", () => {
  it("names where voice is and offers the channel, muted or not", () => {
    const act = vi.fn();
    const items = trayVoiceItems(
      report({ kind: "muted", mic: false }),
      "general · The Stoop",
      act,
    );
    expect(items.map((i) => i.label)).toEqual([
      "In voice · general · The Stoop",
      "Show channel",
    ]);
    expect(items[0].enabled).toBe(false);
    click(items[1]);
    expect(act).toHaveBeenCalledWith("show");
  });

  it("offers to stop each thing that is live, screen first", () => {
    const act = vi.fn();
    const items = trayVoiceItems(
      report({ kind: "screen", mic: true, camera: true, screen: true }),
      "here",
      act,
    );
    expect(items.map((i) => i.label)).toEqual([
      "In voice · here",
      "Stop sharing screen",
      "Turn camera off",
      "Mute microphone",
      "Show channel",
    ]);
    for (const item of items.slice(1)) click(item);
    expect(act.mock.calls.map(([a]) => a)).toEqual([
      "stop-screen",
      "camera-off",
      "mute",
      "show",
    ]);
  });
});

describe("voiceMenuItems", () => {
  it("is greyed out of voice, with the keys still shown", () => {
    const [mute, deafen] = voiceMenuItems(null, vi.fn());
    expect(mute).toMatchObject({
      label: "Mute",
      enabled: false,
      accelerator: ACCELERATORS.toggleMute,
    });
    expect(deafen).toMatchObject({
      label: "Deafen",
      enabled: false,
      accelerator: ACCELERATORS.toggleDeafen,
    });
  });

  it("asks for the opposite of the state reported", () => {
    const act = vi.fn();
    const [mute, deafen] = voiceMenuItems(
      report({ mic: true, deafened: false }),
      act,
    );
    expect(mute).toMatchObject({ label: "Mute", enabled: true });
    expect(deafen).toMatchObject({ label: "Deafen", enabled: true });
    click(mute);
    click(deafen);
    expect(act.mock.calls.map(([a]) => a)).toEqual(["mute", "deafen"]);
  });

  it("offers the way back when muted and deafened", () => {
    const act = vi.fn();
    const [mute, deafen] = voiceMenuItems(
      report({ kind: "muted", mic: false, deafened: true }),
      act,
    );
    expect(mute.label).toBe("Unmute");
    expect(deafen.label).toBe("Undeafen");
    click(mute);
    click(deafen);
    expect(act.mock.calls.map(([a]) => a)).toEqual(["unmute", "undeafen"]);
  });
});
