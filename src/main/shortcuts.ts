// Every key the shell binds, declared here and nowhere else. All of them
// are menu accelerators: they work whichever view has focus and the menu
// shows them. Keys that act inside one page belong to the web app.

export const ACCELERATORS = {
  settings: "CmdOrCtrl+,",
  toggleMute: "CmdOrCtrl+Shift+M",
  toggleDeafen: "CmdOrCtrl+Shift+D",
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
