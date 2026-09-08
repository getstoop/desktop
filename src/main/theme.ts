import { nativeTheme } from "electron";
import type { Palette } from "../shared/bridge";
import {
  PALETTES,
  resolveTheme,
  type ThemeId,
  type ThemePreference,
} from "../shared/themes";

export { shellTheme } from "../shared/themes";

// The theme the app wears now: the preference resolved against the OS
// when it says to follow the system. Everything the shell paints, and
// every server page, takes this one answer.
export function activeTheme(pref: ThemePreference): ThemeId {
  return resolveTheme(pref, nativeTheme.shouldUseDarkColors);
}

export function paletteFor(theme: ThemeId): Palette {
  return PALETTES[theme];
}

// Fires when the OS switches light and dark, which changes the answer
// only in system mode; the caller decides whether anything moved.
export function onSystemTheme(handler: () => void): () => void {
  nativeTheme.on("updated", handler);
  return () => nativeTheme.removeListener("updated", handler);
}
