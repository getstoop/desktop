import type { Palette, ShellTheme } from "./bridge";

// The app's own copy of the web app's themes: the same ids, names and
// colours as web/src/themes.css and web/src/api/theme.ts in the server
// repository. The shell owns the theme while it is open — its own pages
// wear it with no server in front, and every server page is handed the
// whole theme through window.stoop — so it has to know every theme
// itself. What the two sides share is the shape of a theme, the tokens
// below; a theme the page has never heard of still renders in full from
// them. docs/architecture/desktop.md in the server repo.

export type ThemeId =
  | "brownstone"
  | "daylight"
  | "dusk"
  | "bodega"
  | "newsprint"
  | "blackout"
  | "fire-escape"
  | "nightcap"
  | "night-bus"
  | "mailbox";

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  kind: "dark" | "light";
  blurb: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: "brownstone",
    name: "Brownstone",
    kind: "dark",
    blurb: "Charcoal and terracotta. The original.",
  },
  {
    id: "daylight",
    name: "Daylight",
    kind: "light",
    blurb: "Warm paper, the same terracotta.",
  },
  {
    id: "dusk",
    name: "Dusk",
    kind: "dark",
    blurb: "Ink violet, streetlight amber.",
  },
  {
    id: "bodega",
    name: "Bodega",
    kind: "dark",
    blurb: "Bottle green, mustard awning.",
  },
  {
    id: "newsprint",
    name: "Newsprint",
    kind: "light",
    blurb: "Cool paper, steel. Tool, not hangout.",
  },
  {
    id: "blackout",
    name: "Blackout",
    kind: "dark",
    blurb: "True black, high contrast.",
  },
  {
    id: "fire-escape",
    name: "Fire Escape",
    kind: "dark",
    blurb: "Charcoal, painted-iron blue.",
  },
  {
    id: "nightcap",
    name: "Nightcap",
    kind: "dark",
    blurb: "Espresso and cream, dusty rose.",
  },
  {
    id: "night-bus",
    name: "Night Bus",
    kind: "dark",
    blurb: "Indigo windows, lilac rail.",
  },
  {
    id: "mailbox",
    name: "Mailbox",
    kind: "dark",
    blurb: "Postal blue, chalk lettering.",
  },
];

// Every token of web/src/themes.css, per theme. The shell's own pages
// use the colours; the rest cross the bridge so a server page wears
// the theme whole.
export const PALETTES: Record<ThemeId, Palette> = {
  brownstone: {
    canvas: "#141517",
    surface: "#1b1d21",
    panel: "#24262b",
    raised: "#2e3138",
    hover: "rgba(255, 255, 255, 0.035)",
    border: "#33363d",
    text: "#e6e7ea",
    textMuted: "#9a9da5",
    accent: "#e2725b",
    accentSoft: "rgba(226, 114, 91, 0.2)",
    onAccent: "#ffffff",
    ok: "#58b374",
    warn: "#e0a83c",
    danger: "#e05c5c",
    shadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
    scrim: "rgba(0, 0, 0, 0.55)",
    scheme: "dark",
  },
  daylight: {
    canvas: "#eae6df",
    surface: "#f6f4f0",
    panel: "#ffffff",
    raised: "#ebe8e2",
    hover: "rgba(30, 20, 10, 0.045)",
    border: "#d9d5cd",
    text: "#1f1d1a",
    textMuted: "#6b675f",
    accent: "#b5482f",
    accentSoft: "rgba(181, 72, 47, 0.14)",
    onAccent: "#ffffff",
    ok: "#3f8f5b",
    warn: "#b0791a",
    danger: "#c74a4a",
    shadow: "0 10px 30px rgba(40, 30, 20, 0.14)",
    scrim: "rgba(30, 25, 20, 0.45)",
    scheme: "light",
  },
  dusk: {
    canvas: "#15142a",
    surface: "#1c1b36",
    panel: "#242243",
    raised: "#302e56",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#3a3862",
    text: "#e9e6f5",
    textMuted: "#a39fc2",
    accent: "#f0b35a",
    accentSoft: "rgba(240, 179, 90, 0.18)",
    onAccent: "#1c1b36",
    ok: "#6cc48c",
    warn: "#f0b35a",
    danger: "#ef7070",
    shadow: "0 12px 32px rgba(5, 4, 20, 0.55)",
    scrim: "rgba(10, 8, 30, 0.6)",
    scheme: "dark",
  },
  bodega: {
    canvas: "#0f1a17",
    surface: "#152420",
    panel: "#1c2e29",
    raised: "#27403a",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#2f4a43",
    text: "#e4efe9",
    textMuted: "#93ada4",
    accent: "#e8c547",
    accentSoft: "rgba(232, 197, 71, 0.16)",
    onAccent: "#152420",
    ok: "#7ad39a",
    warn: "#e8c547",
    danger: "#ef7a6a",
    shadow: "0 12px 32px rgba(0, 10, 6, 0.55)",
    scrim: "rgba(5, 15, 12, 0.6)",
    scheme: "dark",
  },
  newsprint: {
    canvas: "#e9e9ea",
    surface: "#f2f2f3",
    panel: "#ffffff",
    raised: "#e7e7ea",
    hover: "rgba(29, 31, 32, 0.05)",
    border: "#d4d4d7",
    text: "#1d1f20",
    textMuted: "#5d5d60",
    accent: "#416180",
    accentSoft: "rgba(65, 97, 128, 0.12)",
    onAccent: "#ffffff",
    ok: "#2f8f57",
    warn: "#9a6b0f",
    danger: "#c23f3f",
    shadow: "0 10px 30px rgba(29, 31, 32, 0.14)",
    scrim: "rgba(29, 31, 32, 0.45)",
    scheme: "light",
  },
  blackout: {
    canvas: "#000000",
    surface: "#000000",
    panel: "#0d0d0d",
    raised: "#1f1f1f",
    hover: "#171717",
    border: "#3a3a3a",
    text: "#ffffff",
    textMuted: "#c9c9c9",
    accent: "#ffd60a",
    accentSoft: "rgba(255, 214, 10, 0.18)",
    onAccent: "#000000",
    ok: "#5ff08a",
    warn: "#ffd60a",
    danger: "#ff6b6b",
    shadow: "0 12px 32px rgba(0, 0, 0, 0.8)",
    scrim: "rgba(0, 0, 0, 0.75)",
    scheme: "dark",
  },
  "fire-escape": {
    canvas: "#141517",
    surface: "#1b1d21",
    panel: "#24262b",
    raised: "#2e3138",
    hover: "rgba(255, 255, 255, 0.035)",
    border: "#33363d",
    text: "#e6e7ea",
    textMuted: "#9a9da5",
    accent: "#8aa6c8",
    accentSoft: "rgba(138, 166, 200, 0.2)",
    onAccent: "#141517",
    ok: "#58b374",
    warn: "#e0a83c",
    danger: "#e05c5c",
    shadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
    scrim: "rgba(0, 0, 0, 0.55)",
    scheme: "dark",
  },
  nightcap: {
    canvas: "#1a1412",
    surface: "#231b18",
    panel: "#2c2320",
    raised: "#3a2f2b",
    hover: "rgba(255, 240, 230, 0.04)",
    border: "#433732",
    text: "#f1e8e0",
    textMuted: "#b5a49b",
    accent: "#d98e9c",
    accentSoft: "rgba(217, 142, 156, 0.18)",
    onAccent: "#1a1412",
    ok: "#7cc48f",
    warn: "#e0b055",
    danger: "#ea6f55",
    shadow: "0 12px 32px rgba(10, 5, 3, 0.55)",
    scrim: "rgba(15, 8, 6, 0.6)",
    scheme: "dark",
  },
  "night-bus": {
    canvas: "#161826",
    surface: "#1c1f2e",
    panel: "#232532",
    raised: "#2e3142",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#383b4e",
    text: "#e9e9ed",
    textMuted: "#9397ab",
    accent: "#b5abfc",
    accentSoft: "rgba(181, 171, 252, 0.16)",
    onAccent: "#161826",
    ok: "#79d3a5",
    warn: "#e2b263",
    danger: "#ff8a80",
    shadow: "0 16px 40px rgba(0, 0, 0, 0.65)",
    scrim: "rgba(10, 12, 26, 0.62)",
    scheme: "dark",
  },
  mailbox: {
    canvas: "#0d131c",
    surface: "#131b26",
    panel: "#1a2330",
    raised: "#253141",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#2d3b4c",
    text: "#e2e9f1",
    textMuted: "#8fa1b5",
    accent: "#74bdf2",
    accentSoft: "rgba(116, 189, 242, 0.16)",
    onAccent: "#0d131c",
    ok: "#67cea0",
    warn: "#e4b65c",
    danger: "#f0827a",
    shadow: "0 12px 32px rgba(0, 6, 16, 0.6)",
    scrim: "rgba(5, 11, 20, 0.62)",
    scheme: "dark",
  },
};

// The CSS custom property each token is, on both sides.
const CSS_NAMES: Record<keyof Omit<Palette, "scheme">, string> = {
  canvas: "--canvas",
  surface: "--surface",
  panel: "--panel",
  raised: "--raised",
  hover: "--hover",
  border: "--border",
  text: "--text",
  textMuted: "--text-muted",
  accent: "--accent",
  accentSoft: "--accent-soft",
  onAccent: "--on-accent",
  ok: "--ok",
  warn: "--warn",
  danger: "--danger",
  shadow: "--shadow",
  scrim: "--scrim",
};

// A palette as CSS custom properties, which is how a page wears it.
export function cssTokens(palette: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, name] of Object.entries(CSS_NAMES))
    out[name] = palette[key as keyof typeof CSS_NAMES];
  return out;
}

// The theme as it crosses the bridge to a server page.
export function shellTheme(id: ThemeId): ShellTheme {
  const palette = PALETTES[id];
  return { scheme: palette.scheme, tokens: cssTokens(palette) };
}

// What the person chose. "Follow system" is a preference, not a theme:
// it picks one of the dark/light pair by the OS setting. The same shape
// the web app keeps in a browser, so the two stay recognisable.
export interface ThemePreference {
  mode: "theme" | "system";
  theme: ThemeId;
  dark: ThemeId;
  light: ThemeId;
}

export const DEFAULT_THEME: ThemePreference = {
  mode: "theme",
  theme: "brownstone",
  dark: "brownstone",
  light: "daylight",
};

export const isTheme = (v: unknown): v is ThemeId =>
  THEMES.some((t) => t.id === v);

// A preference as read from disk or IPC: every field checked, anything
// missing or unknown replaced by the default.
export function themePreference(raw: unknown): ThemePreference {
  const p = (raw ?? {}) as Partial<ThemePreference>;
  return {
    mode: p.mode === "system" ? "system" : "theme",
    theme: isTheme(p.theme) ? p.theme : DEFAULT_THEME.theme,
    dark: isTheme(p.dark) ? p.dark : DEFAULT_THEME.dark,
    light: isTheme(p.light) ? p.light : DEFAULT_THEME.light,
  };
}

// The theme a preference resolves to right now.
export function resolveTheme(p: ThemePreference, systemDark: boolean): ThemeId {
  if (p.mode === "system") return systemDark ? p.dark : p.light;
  return p.theme;
}
