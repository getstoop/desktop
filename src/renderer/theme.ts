import type { Palette } from "../shared/bridge";
import { cssTokens } from "../shared/themes";

// The shell's own pages wear the app's theme, so a picker or a settings
// page sits in the same colours as the server behind it. shell.css holds
// Brownstone for the moment before this arrives.
function paint(palette: Palette) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(cssTokens(palette)))
    root.style.setProperty(name, value);
  root.style.colorScheme = palette.scheme;
}

// Never throws: this runs at the top of every shell page, and a page
// that cannot ask for the palette must still wire up its buttons.
export function followTheme() {
  const shell = window.shell as Partial<Window["shell"]> | undefined;
  try {
    void shell?.getTheme?.().then(paint);
    shell?.onTheme?.(paint);
  } catch {
    // shell.css's own palette stands.
  }
}
