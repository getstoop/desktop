import type { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// electron-updater's autoUpdater, reduced to what updates.ts touches: the
// events it emits, and the two calls made on it. Hoisted above the
// imports, so node:events is fetched from inside.
const fake = await vi.hoisted(async () => {
  const { EventEmitter } = await import("node:events");
  const emitter = new EventEmitter() as EventEmitter & {
    logger: unknown;
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    checkForUpdates: ReturnType<typeof vi.fn>;
    quitAndInstall: ReturnType<typeof vi.fn>;
  };
  emitter.checkForUpdates = vi.fn();
  emitter.quitAndInstall = vi.fn();
  return { autoUpdater: emitter, packaged: true };
});

vi.mock("electron", () => ({
  app: {
    get isPackaged() {
      return fake.packaged;
    },
  },
}));
vi.mock("electron-updater", () => ({ autoUpdater: fake.autoUpdater }));

import { describe as describeError, Updates } from "./updates";

beforeEach(() => {
  fake.packaged = true;
  fake.autoUpdater.removeAllListeners();
  fake.autoUpdater.checkForUpdates.mockReset();
  fake.autoUpdater.checkForUpdates.mockResolvedValue(null);
  fake.autoUpdater.quitAndInstall.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Updates", () => {
  it("is off for a build run from a checkout, and does nothing", async () => {
    fake.packaged = false;
    const updates = new Updates();
    expect(updates.state).toEqual({ kind: "off" });
    updates.start();
    await updates.check();
    updates.install();
    expect(fake.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(fake.autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it("starts idle and unchecked in a packaged build", () => {
    expect(new Updates().state).toEqual({ kind: "idle", checkedAt: null });
    expect(fake.autoUpdater.autoDownload).toBe(true);
    expect(fake.autoUpdater.autoInstallOnAppQuit).toBe(true);
  });

  it("follows the updater from a check to a download to ready", () => {
    const updates = new Updates();
    const seen: string[] = [];
    updates.onChange(() => seen.push(updates.state.kind));
    fake.autoUpdater.emit("checking-for-update");
    expect(updates.state).toEqual({ kind: "checking" });
    fake.autoUpdater.emit("update-available", { version: "0.2.0" });
    expect(updates.state).toEqual({
      kind: "downloading",
      version: "0.2.0",
      percent: 0,
    });
    fake.autoUpdater.emit("download-progress", { percent: 42.7 });
    expect(updates.state).toEqual({
      kind: "downloading",
      version: "0.2.0",
      percent: 42,
    });
    fake.autoUpdater.emit("update-downloaded", { version: "0.2.0" });
    expect(updates.state).toEqual({ kind: "ready", version: "0.2.0" });
    expect(seen).toEqual(["checking", "downloading", "downloading", "ready"]);
  });

  it("is up to date, as of now, when nothing newer is out", () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    const updates = new Updates();
    fake.autoUpdater.emit("update-not-available", { version: "0.1.0" });
    expect(updates.state).toEqual({
      kind: "idle",
      checkedAt: 1_700_000_000_000,
    });
  });

  it("keeps a progress event from an earlier download out of a later state", () => {
    const updates = new Updates();
    fake.autoUpdater.emit("update-downloaded", { version: "0.2.0" });
    fake.autoUpdater.emit("download-progress", { percent: 50 });
    expect(updates.state).toEqual({ kind: "ready", version: "0.2.0" });
  });

  it("checks when idle or after an error, and not while busy or ready", async () => {
    const updates = new Updates();
    await updates.check();
    expect(fake.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    fake.autoUpdater.emit("error", new Error("net::ERR_INTERNET_DISCONNECTED"));
    await updates.check();
    expect(fake.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
    for (const busy of [
      { kind: "checking" },
      { kind: "downloading", version: "0.2.0", percent: 1 },
      { kind: "ready", version: "0.2.0" },
    ] as const) {
      updates.state = busy;
      await updates.check();
    }
    expect(fake.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it("turns a check that rejects without an event into an error", async () => {
    const updates = new Updates();
    fake.autoUpdater.checkForUpdates.mockImplementation(() => {
      fake.autoUpdater.emit("checking-for-update");
      return Promise.reject(new Error("HttpError: 404 Not Found\nmore"));
    });
    await updates.check();
    expect(updates.state).toEqual({
      kind: "error",
      detail: "HttpError: 404 Not Found",
    });
  });

  it("installs only what is ready", () => {
    const updates = new Updates();
    updates.install();
    expect(fake.autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    fake.autoUpdater.emit("update-downloaded", { version: "0.2.0" });
    updates.install();
    expect(fake.autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it("checks soon after start and every four hours after that", async () => {
    vi.useFakeTimers();
    const updates = new Updates();
    updates.start();
    expect(fake.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15 * 1000);
    expect(fake.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000);
    expect(fake.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it("lets a listener go", () => {
    const updates = new Updates();
    const listener = vi.fn();
    const off = updates.onChange(listener);
    fake.autoUpdater.emit("checking-for-update");
    off();
    fake.autoUpdater.emit("update-not-available", { version: "0.1.0" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("describe", () => {
  it("names a lost connection plainly", () => {
    expect(describeError(new Error("net::ERR_INTERNET_DISCONNECTED"))).toBe(
      "No connection to github.com.",
    );
    expect(describeError(new Error("getaddrinfo ENOTFOUND github.com"))).toBe(
      "No connection to github.com.",
    );
  });

  it("keeps the first line of anything else", () => {
    expect(describeError(new Error("Cannot find latest.yml\nHeaders: …"))).toBe(
      "Cannot find latest.yml",
    );
    expect(describeError("")).toBe("Something went wrong.");
  });
});
