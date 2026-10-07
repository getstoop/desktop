import { join } from "node:path";
import { app, shell } from "electron";

// The one question push to talk asks of the system: is this key held
// right now? Answered by native/keys, a small addon built with the app
// (pnpm native) and shipped beside it as keys.node. If it is missing or
// will not load, push to talk is simply unavailable.

export type Key = "backquote" | "control";
// Input Monitoring on macOS; "unsupported" on Linux with no X display,
// or wherever the addon did not load.
export type KeyAccess = "granted" | "denied" | "unknown" | "unsupported";

interface Keys {
  isKeyDown(key: Key): boolean;
  keyAccess(): KeyAccess;
  // Shows the system's prompt where there is one; true once granted.
  requestKeyAccess(): boolean;
}

let loaded: Keys | null | undefined;

function keys(): Keys | null {
  if (loaded === undefined) {
    const path = app.isPackaged
      ? join(process.resourcesPath, "keys.node")
      : join(app.getAppPath(), "native/keys/build/Release/keys.node");
    try {
      loaded = require(path) as Keys;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

export function isKeyDown(key: Key): boolean {
  return keys()?.isKeyDown(key) ?? false;
}

export function keyAccess(): KeyAccess {
  return keys()?.keyAccess() ?? "unsupported";
}

export function requestKeyAccess(): boolean {
  return keys()?.requestKeyAccess() ?? false;
}

export const KEY_ACCESS_SETTINGS =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent";

// Turning push to talk on is when macOS is asked for Input Monitoring.
// It shows its prompt once per app; asked again after that it answers
// "no" in silence, so then the pane where the switch lives opens instead.
export function askKeyAccess() {
  const access = keyAccess();
  if (access === "unknown") requestKeyAccess();
  else if (access === "denied") void shell.openExternal(KEY_ACCESS_SETTINGS);
}
