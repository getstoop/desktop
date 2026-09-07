import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, type Rectangle, screen } from "electron";

// What the window looked like last time: its bounds, whether it was
// maximized, and which server was in front. One JSON file beside the
// server list.

export interface WindowState {
  bounds?: Rectangle;
  maximized?: boolean;
  front?: string; // server id
}

const file = () => join(app.getPath("userData"), "window-state.json");

export function loadWindowState(): WindowState {
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8")) as WindowState;
    // Bounds on a display that is no longer attached would open the
    // window off screen; fall back to the default placement.
    if (
      raw.bounds &&
      !screen
        .getAllDisplays()
        .some((d) => intersects(d.workArea, raw.bounds as Rectangle))
    ) {
      raw.bounds = undefined;
    }
    return raw;
  } catch {
    return {};
  }
}

export function saveWindowState(state: WindowState) {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(file(), JSON.stringify(state, null, 2));
}

function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    b.x < a.x + a.width &&
    b.x + b.width > a.x &&
    b.y < a.y + a.height &&
    b.y + b.height > a.y
  );
}
