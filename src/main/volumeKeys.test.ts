import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCELERATORS } from "./shortcuts";
import { VolumeKeys } from "./volumeKeys";

// globalShortcut stands in: what is registered, and a way to press it.
const shortcuts = vi.hoisted(() => {
  const bound = new Map<string, () => void>();
  return {
    bound,
    register: vi.fn((key: string, cb: () => void) => {
      bound.set(key, cb);
      return true;
    }),
    unregister: vi.fn((key: string) => void bound.delete(key)),
  };
});

vi.mock("electron", () => ({
  globalShortcut: {
    register: shortcuts.register,
    unregister: shortcuts.unregister,
  },
}));

describe("VolumeKeys", () => {
  let sent: string[];
  let keys: VolumeKeys;
  beforeEach(() => {
    sent = [];
    shortcuts.bound.clear();
    shortcuts.register.mockClear();
    shortcuts.unregister.mockClear();
    keys = new VolumeKeys((a) => sent.push(a));
  });

  it("holds both keys only while on, once", () => {
    keys.sync(true);
    keys.sync(true);
    expect([...shortcuts.bound.keys()]).toEqual([
      ACCELERATORS.volumeUp,
      ACCELERATORS.volumeDown,
    ]);
    expect(shortcuts.register).toHaveBeenCalledTimes(2);
    keys.sync(false);
    keys.sync(false);
    expect(shortcuts.bound.size).toBe(0);
    expect(shortcuts.unregister).toHaveBeenCalledTimes(2);
  });

  it("sends one step per press", () => {
    keys.sync(true);
    shortcuts.bound.get(ACCELERATORS.volumeUp)?.();
    shortcuts.bound.get(ACCELERATORS.volumeDown)?.();
    shortcuts.bound.get(ACCELERATORS.volumeUp)?.();
    expect(sent).toEqual(["volume-up", "volume-down", "volume-up"]);
  });

  it("lets go when nothing could be registered", () => {
    shortcuts.register.mockReturnValue(false);
    keys.sync(true);
    keys.sync(true);
    // Not registered, so a later "on" tries again.
    expect(shortcuts.register).toHaveBeenCalledTimes(4);
  });
});
