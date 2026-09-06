// The window.stoop contract, version 1. The server repo declares the same
// shape in web/src/api/platform.ts and publishes the level it speaks from
// GET /version; the two move together. docs/architecture/desktop.md there.

export const BRIDGE = 1;

export type ShortcutName = "pushToTalk";

export interface StoopBridge {
  bridge: number;
  version: string;
  platform: "darwin" | "win32" | "linux";
  setBadge(count: number): void;
  onShortcut(name: ShortcutName, handler: (down: boolean) => void): () => void;
}

// IPC channel names, one place so main and preload cannot drift.
export const IPC = {
  setBadge: "stoop:set-badge",
  shortcut: "stoop:shortcut",
  openServer: "shell:open-server",
} as const;
