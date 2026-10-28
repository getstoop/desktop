import { globalShortcut } from "electron";
import { ACCELERATORS } from "./shortcuts";

// The volume keys from any app: while the switch is on and a server is
// in a call, Ctrl+Shift+Up and Ctrl+Shift+Down step that call's volume
// wherever the keyboard is. Each press sends one volume-up or
// volume-down voice action, which the page carries out; nothing is held,
// so unlike push to talk globalShortcut alone is enough, and a held key
// repeats where the system repeats a hotkey. Registered only while
// needed: a global shortcut takes the keys from every other app, and
// out of a call there is nothing for them to do.
//
// The Voice menu shows the same keys on its items. While the global
// shortcut is registered the system hands the press to it before the
// menu ever sees it, so a press is one step; with the switch off the
// menu's accelerators still work while the app is focused.

export type VolumeAction = "volume-up" | "volume-down";

export class VolumeKeys {
  private registered = false;

  constructor(private send: (action: VolumeAction) => void) {}

  sync(on: boolean) {
    if (on === this.registered) return;
    if (on) {
      const up = globalShortcut.register(ACCELERATORS.volumeUp, () =>
        this.send("volume-up"),
      );
      const down = globalShortcut.register(ACCELERATORS.volumeDown, () =>
        this.send("volume-down"),
      );
      this.registered = up || down;
    } else {
      globalShortcut.unregister(ACCELERATORS.volumeUp);
      globalShortcut.unregister(ACCELERATORS.volumeDown);
      this.registered = false;
    }
  }
}
