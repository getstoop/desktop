// Every key the shell binds, declared here and nowhere else. All of them
// are menu accelerators: they work whichever view has focus and the menu
// shows them. The volume keys are also held from any app while a call is
// up (volumeKeys.ts). Keys that act inside one page belong to the web app.

export const ACCELERATORS = {
  settings: "CmdOrCtrl+,",
  toggleMute: "CmdOrCtrl+Shift+M",
  toggleDeafen: "CmdOrCtrl+Shift+D",
  // Ctrl on every platform, as push to talk is: Cmd+Shift+Up and Down
  // are macOS's own select-to-top and select-to-bottom.
  volumeUp: "Control+Shift+Up",
  volumeDown: "Control+Shift+Down",
} as const;

// The first nine servers, by position.
export function serverAccelerator(index: number): string | undefined {
  return index < 9 ? `CmdOrCtrl+${index + 1}` : undefined;
}

// The same key as the switcher prints it.
export function serverHint(index: number, mac: boolean): string {
  if (index >= 9) return "";
  return mac ? `⌘${index + 1}` : `Ctrl+${index + 1}`;
}
