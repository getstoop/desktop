import type { Palette } from "../shared/bridge";

// The shell's own pages take their colours from the server in front, so
// a picker or a settings page sits in the same theme as the app behind
// it. shell.css holds the default palette for the moment before this
// arrives, and for when there is no server yet.
function paint(palette: Palette) {
  const root = document.documentElement;
  root.style.setProperty("--canvas", palette.canvas);
  root.style.setProperty("--surface", palette.surface);
  root.style.setProperty("--panel", palette.panel);
  root.style.setProperty("--raised", palette.raised);
  root.style.setProperty("--border", palette.border);
  root.style.setProperty("--text", palette.text);
  root.style.setProperty("--text-muted", palette.textMuted);
  root.style.colorScheme = palette.scheme;
}

export function followTheme() {
  void window.shell.getTheme().then(paint);
  window.shell.onTheme(paint);
}
