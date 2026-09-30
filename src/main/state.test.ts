import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Rectangle } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadWindowState, saveWindowState } from "./state";

const electron = vi.hoisted(() => ({
  userData: "",
  workAreas: [] as { x: number; y: number; width: number; height: number }[],
}));

vi.mock("electron", () => ({
  app: { getPath: () => electron.userData },
  screen: {
    getAllDisplays: () => electron.workAreas.map((workArea) => ({ workArea })),
  },
}));

const write = (raw: unknown) =>
  writeFileSync(
    join(electron.userData, "window-state.json"),
    typeof raw === "string" ? raw : JSON.stringify(raw),
  );

// One 1920×1080 display at the origin, and a second to its right.
const primary = { x: 0, y: 0, width: 1920, height: 1080 };
const secondary = { x: 1920, y: 0, width: 1920, height: 1080 };

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "stoop-state-"));
  electron.userData = root;
  electron.workAreas = [primary];
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("loadWindowState", () => {
  it("is empty when nothing was saved or the file is not JSON", () => {
    expect(loadWindowState()).toEqual({});
    write("nope");
    expect(loadWindowState()).toEqual({});
  });

  it("keeps bounds on a display that is attached", () => {
    const bounds: Rectangle = { x: 100, y: 100, width: 1200, height: 800 };
    write({ bounds, maximized: false, front: "abc" });
    expect(loadWindowState()).toEqual({
      bounds,
      maximized: false,
      front: "abc",
    });
  });

  it("keeps bounds that overlap a display only partly", () => {
    const bounds: Rectangle = { x: 1800, y: 900, width: 1200, height: 800 };
    write({ bounds });
    expect(loadWindowState().bounds).toEqual(bounds);
  });

  it("keeps bounds on a second display while it is attached", () => {
    electron.workAreas = [primary, secondary];
    const bounds: Rectangle = { x: 2000, y: 100, width: 1200, height: 800 };
    write({ bounds });
    expect(loadWindowState().bounds).toEqual(bounds);
  });

  it("drops bounds on a display that is no longer attached", () => {
    const bounds: Rectangle = { x: 2000, y: 100, width: 1200, height: 800 };
    write({ bounds, maximized: true, front: "abc" });
    expect(loadWindowState()).toEqual({
      bounds: undefined,
      maximized: true,
      front: "abc",
    });
  });

  it("drops bounds that only touch a display's edge", () => {
    write({ bounds: { x: 1920, y: 0, width: 800, height: 600 } });
    expect(loadWindowState().bounds).toBeUndefined();
  });
});

describe("saveWindowState", () => {
  it("writes what loadWindowState reads back", () => {
    electron.userData = join(root, "fresh");
    const state = {
      bounds: { x: 10, y: 20, width: 800, height: 600 },
      maximized: false,
      front: "server-1",
    };
    saveWindowState(state);
    expect(loadWindowState()).toEqual(state);
  });
});
