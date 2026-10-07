import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VoiceReport } from "../shared/bridge";
import { callMuted, createHold, POLL_MS, RELEASE_TAIL_MS } from "./pushToTalk";

vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => "/nonexistent" },
  globalShortcut: { register: () => true, unregister: () => {} },
}));

const report = (over: Partial<VoiceReport> = {}): VoiceReport => ({
  kind: "muted",
  mic: false,
  camera: false,
  screen: false,
  deafened: false,
  channel: "lounge",
  space: "home",
  ...over,
});

describe("callMuted", () => {
  it("is a call that is up with the mic off", () => {
    expect(callMuted(report())).toBe(true);
    expect(callMuted(report({ kind: "camera", camera: true }))).toBe(true);
  });

  it("is not a live mic, a call still joining or failed, or no call", () => {
    expect(callMuted(report({ kind: "mic", mic: true }))).toBe(false);
    expect(callMuted(report({ kind: "joining" }))).toBe(false);
    expect(callMuted(report({ kind: "error" }))).toBe(false);
    expect(callMuted(null)).toBe(false);
  });
});

describe("createHold", () => {
  let sent: string[];
  let muted: boolean;
  let held: boolean;
  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    muted = true;
    held = true;
  });
  afterEach(() => vi.useRealTimers());
  const hold = () =>
    createHold({
      muted: () => muted,
      held: () => held,
      // The page's next voice report follows the action.
      send: (action) => {
        sent.push(action);
        muted = action === "mute";
      },
    });
  // Let go: the next poll sees it, and the tail runs out after it.
  const release = () => {
    held = false;
    vi.advanceTimersByTime(POLL_MS + RELEASE_TAIL_MS);
  };

  it("unmutes on the press and mutes a tail after the keys come up", () => {
    const h = hold();
    h.press();
    expect(sent).toEqual(["unmute"]);
    vi.advanceTimersByTime(POLL_MS * 20);
    expect(sent).toEqual(["unmute"]);
    held = false;
    vi.advanceTimersByTime(POLL_MS);
    vi.advanceTimersByTime(RELEASE_TAIL_MS - 1);
    expect(sent).toEqual(["unmute"]);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual(["unmute", "mute"]);
  });

  it("does nothing when the call was not muted to start", () => {
    muted = false;
    const h = hold();
    h.press();
    release();
    expect(sent).toEqual([]);
  });

  it("never lets a press on an open call turn into a hold while the keys stay down", () => {
    muted = false;
    const h = hold();
    h.press();
    muted = true; // Mute clicked with the key still held
    h.press(); // the shortcut firing again for the same held key
    vi.advanceTimersByTime(POLL_MS * 10);
    expect(sent).toEqual([]);
    release();
    expect(sent).toEqual([]);
    // Let go and pressed afresh: a new hold, which unmutes.
    held = true;
    h.press();
    expect(sent).toEqual(["unmute"]);
  });

  it("counts a repeated press during the hold once", () => {
    const h = hold();
    h.press();
    h.press();
    release();
    expect(sent).toEqual(["unmute", "mute"]);
  });

  it("carries on the same hold when pressed again inside the tail", () => {
    const h = hold();
    h.press();
    held = false;
    vi.advanceTimersByTime(POLL_MS);
    held = true;
    h.press();
    vi.advanceTimersByTime(RELEASE_TAIL_MS * 4);
    expect(sent).toEqual(["unmute"]);
    release();
    expect(sent).toEqual(["unmute", "mute"]);
  });

  it("unmutes again when pressed inside the tail after the call went quiet", () => {
    const h = hold();
    h.press();
    held = false;
    vi.advanceTimersByTime(POLL_MS);
    muted = true; // the unmute was refused, or Mute was clicked
    held = true;
    h.press();
    expect(sent).toEqual(["unmute", "unmute"]);
    release();
    expect(sent).toEqual(["unmute", "unmute", "mute"]);
  });

  it("mutes when stopped mid-hold, and nothing comes after", () => {
    const h = hold();
    h.press();
    h.stop();
    expect(sent).toEqual(["unmute", "mute"]);
    release();
    expect(sent).toEqual(["unmute", "mute"]);
  });

  it("does nothing when stopped while not holding", () => {
    hold().stop();
    expect(sent).toEqual([]);
  });
});
