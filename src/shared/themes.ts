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
  | "mailbox"
  | "subway-tile"
  | "pigeon"
  | "laundromat"
  | "boardwalk"
  | "whiteout"
  | "library"
  | "ginkgo"
  | "rooftop"
  | "water-tower"
  | "streetlight"
  | "neon"
  | "ferry"
  | "bike-lane"
  | "crosswalk"
  | "concrete";

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  // The half of the Follow-system pair this theme can be; dim themes are
  // dark here.
  kind: "dark" | "light";
  // What the picker files it under and prints on its card.
  tier: "light" | "dim" | "dark";
  // Extra picker filters it also answers to.
  tags?: ThemeTag[];
  blurb: string;
  // Why it carries the "accessible" tag; shown under the card in that filter.
  why?: string;
}

export type ThemeTag = "accessible";
export type ThemeFilter = ThemeInfo["tier"] | ThemeTag | "all";

export const THEME_FILTERS: { id: ThemeFilter; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dim", label: "Dim" },
  { id: "dark", label: "Dark" },
  { id: "accessible", label: "Accessible" },
  { id: "all", label: "All" },
];

export const matchesFilter = (t: ThemeInfo, f: ThemeFilter): boolean =>
  f === "all" || t.tier === f || (t.tags ?? []).includes(f as ThemeTag);

export const THEMES: ThemeInfo[] = [
  {
    id: "brownstone",
    name: "Brownstone",
    kind: "dark",
    tier: "dark",
    blurb: "Charcoal and terracotta. The original.",
  },
  {
    id: "daylight",
    name: "Daylight",
    kind: "light",
    tier: "light",
    blurb: "Warm paper, the same terracotta.",
  },
  {
    id: "dusk",
    name: "Dusk",
    kind: "dark",
    tier: "dark",
    blurb: "Ink violet, streetlight amber.",
  },
  {
    id: "bodega",
    name: "Bodega",
    kind: "dark",
    tier: "dark",
    blurb: "Bottle green, mustard awning.",
  },
  {
    id: "newsprint",
    name: "Newsprint",
    kind: "light",
    tier: "light",
    blurb: "Cool paper, steel. Tool, not hangout.",
  },
  {
    id: "blackout",
    name: "Blackout",
    kind: "dark",
    tier: "dark",
    tags: ["accessible"],
    blurb: "True black, high contrast.",
    why: "Highest contrast on a dark ground.",
  },
  {
    id: "fire-escape",
    name: "Fire Escape",
    kind: "dark",
    tier: "dark",
    blurb: "Charcoal, painted-iron blue.",
  },
  {
    id: "nightcap",
    name: "Nightcap",
    kind: "dark",
    tier: "dark",
    blurb: "Espresso and cream, dusty rose.",
  },
  {
    id: "night-bus",
    name: "Night Bus",
    kind: "dark",
    tier: "dark",
    blurb: "Indigo windows, lilac rail.",
  },
  {
    id: "mailbox",
    name: "Mailbox",
    kind: "dark",
    tier: "dark",
    blurb: "Postal blue, chalk lettering.",
  },
  {
    id: "subway-tile",
    name: "Subway Tile",
    kind: "light",
    tier: "light",
    blurb: "White tile, grout, enamel green.",
  },
  {
    id: "pigeon",
    name: "Pigeon",
    kind: "light",
    tier: "light",
    blurb: "Feather grey, iridescent violet.",
  },
  {
    id: "laundromat",
    name: "Laundromat",
    kind: "light",
    tier: "light",
    blurb: "Fluorescent white, mint machines, raspberry.",
  },
  {
    id: "boardwalk",
    name: "Boardwalk",
    kind: "light",
    tier: "light",
    blurb: "Sand, weathered planks, the Atlantic.",
  },
  {
    id: "whiteout",
    name: "Whiteout",
    kind: "light",
    tier: "light",
    tags: ["accessible"],
    blurb: "Pure white, pure black, cobalt.",
    why: "Highest contrast on a light ground.",
  },
  {
    id: "library",
    name: "Library",
    kind: "light",
    tier: "light",
    tags: ["accessible"],
    blurb: "Oak, parchment, a green-shaded lamp.",
    why: "Lower glare: text near 8:1 instead of 15:1.",
  },
  {
    id: "ginkgo",
    name: "Ginkgo",
    kind: "light",
    tier: "light",
    blurb: "November sidewalk, gold leaves.",
  },
  {
    id: "rooftop",
    name: "Rooftop",
    kind: "dark",
    tier: "dim",
    blurb: "Slate at dusk, a peach horizon.",
  },
  {
    id: "water-tower",
    name: "Water Tower",
    kind: "dark",
    tier: "dim",
    blurb: "Cedar planks, galvanized steel, sky.",
  },
  {
    id: "streetlight",
    name: "Streetlight",
    kind: "dark",
    tier: "dark",
    blurb: "Sodium amber on a warm black.",
  },
  {
    id: "neon",
    name: "Neon",
    kind: "dark",
    tier: "dark",
    blurb: "Open 24 hours. Magenta tube, cyan tube.",
  },
  {
    id: "ferry",
    name: "Ferry",
    kind: "dark",
    tier: "dark",
    blurb: "Harbor at night, that orange boat.",
  },
  {
    id: "bike-lane",
    name: "Bike Lane",
    kind: "dark",
    tier: "dark",
    blurb: "Asphalt, thermoplastic white, painted green.",
  },
  {
    id: "crosswalk",
    name: "Crosswalk",
    kind: "dark",
    tier: "dark",
    tags: ["accessible"],
    blurb: "Asphalt, painted stripes, safe signals.",
    why: "Status colours stay apart under red-green colour blindness.",
  },
  {
    id: "concrete",
    name: "Concrete",
    kind: "dark",
    tier: "dark",
    tags: ["accessible"],
    blurb: "Grey on grey. Colour only where it means something.",
    why: "No tint anywhere; colour only where it means something.",
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
  "subway-tile": {
    canvas: "#d9dfdb",
    surface: "#eef2ef",
    panel: "#ffffff",
    raised: "#e2e8e4",
    hover: "rgba(20, 40, 30, 0.05)",
    border: "#ccd4cf",
    text: "#171f1b",
    textMuted: "#586661",
    accent: "#1e6b47",
    accentSoft: "rgba(30, 107, 71, 0.14)",
    onAccent: "#ffffff",
    ok: "#00843a",
    warn: "#a37d00",
    danger: "#d3271f",
    shadow: "0 10px 30px rgba(20, 40, 30, 0.14)",
    scrim: "rgba(20, 30, 25, 0.45)",
    scheme: "light",
  },
  pigeon: {
    canvas: "#d8d9e0",
    surface: "#eaebef",
    panel: "#f9f9fb",
    raised: "#dfe0e7",
    hover: "rgba(40, 40, 60, 0.05)",
    border: "#cbcdd6",
    text: "#1c1c24",
    textMuted: "#5e5f6c",
    accent: "#6a48cf",
    accentSoft: "rgba(106, 72, 207, 0.14)",
    onAccent: "#ffffff",
    ok: "#2f8f4e",
    warn: "#b87613",
    danger: "#cf463d",
    shadow: "0 10px 30px rgba(30, 30, 50, 0.14)",
    scrim: "rgba(28, 28, 40, 0.45)",
    scheme: "light",
  },
  laundromat: {
    canvas: "#dbe7e4",
    surface: "#ecf3f1",
    panel: "#fbfdfd",
    raised: "#e0ebe8",
    hover: "rgba(0, 60, 60, 0.05)",
    border: "#cad9d5",
    text: "#172321",
    textMuted: "#586a66",
    accent: "#c2266a",
    accentSoft: "rgba(194, 38, 106, 0.13)",
    onAccent: "#ffffff",
    ok: "#1f8f5f",
    warn: "#c58217",
    danger: "#d14040",
    shadow: "0 10px 30px rgba(20, 50, 45, 0.14)",
    scrim: "rgba(15, 35, 30, 0.45)",
    scheme: "light",
  },
  boardwalk: {
    canvas: "#e6dcc9",
    surface: "#f4eee2",
    panel: "#fffcf5",
    raised: "#ebe3d3",
    hover: "rgba(60, 40, 10, 0.05)",
    border: "#dccfb9",
    text: "#24201a",
    textMuted: "#6b6252",
    accent: "#1a6aa3",
    accentSoft: "rgba(26, 106, 163, 0.14)",
    onAccent: "#ffffff",
    ok: "#3f8f5b",
    warn: "#b07a0e",
    danger: "#cf4a3a",
    shadow: "0 10px 30px rgba(50, 35, 15, 0.14)",
    scrim: "rgba(35, 25, 10, 0.45)",
    scheme: "light",
  },
  whiteout: {
    canvas: "#ffffff",
    surface: "#ffffff",
    panel: "#f2f2f2",
    raised: "#e0e0e0",
    hover: "#e9e9e9",
    border: "#bdbdbd",
    text: "#000000",
    textMuted: "#3a3a3a",
    accent: "#0033cc",
    accentSoft: "rgba(0, 51, 204, 0.14)",
    onAccent: "#ffffff",
    ok: "#007a33",
    warn: "#8a5a00",
    danger: "#d40000",
    shadow: "0 12px 32px rgba(0, 0, 0, 0.25)",
    scrim: "rgba(0, 0, 0, 0.55)",
    scheme: "light",
  },
  library: {
    canvas: "#e3d9c6",
    surface: "#eee6d6",
    panel: "#f6f0e4",
    raised: "#e6dcc9",
    hover: "rgba(70, 50, 20, 0.05)",
    border: "#d5c9b3",
    text: "#4b4036",
    textMuted: "#7d6f60",
    accent: "#2f6e50",
    accentSoft: "rgba(47, 110, 80, 0.14)",
    onAccent: "#ffffff",
    ok: "#4f8f60",
    warn: "#a37a1c",
    danger: "#b8503f",
    shadow: "0 10px 30px rgba(60, 40, 15, 0.12)",
    scrim: "rgba(45, 35, 20, 0.4)",
    scheme: "light",
  },
  ginkgo: {
    canvas: "#dfe3d9",
    surface: "#eef0ea",
    panel: "#f8f9f5",
    raised: "#e4e7df",
    hover: "rgba(30, 40, 20, 0.05)",
    border: "#cfd4c8",
    text: "#1e211c",
    textMuted: "#5d635a",
    accent: "#816200",
    accentSoft: "rgba(129, 98, 0, 0.16)",
    onAccent: "#ffffff",
    ok: "#3f8a4f",
    warn: "#b07d00",
    danger: "#c4453a",
    shadow: "0 10px 30px rgba(30, 40, 20, 0.14)",
    scrim: "rgba(25, 30, 20, 0.45)",
    scheme: "light",
  },
  rooftop: {
    canvas: "#262c3a",
    surface: "#2e3544",
    panel: "#363e4e",
    raised: "#434c5e",
    hover: "rgba(255, 255, 255, 0.045)",
    border: "#4a5366",
    text: "#eef0f4",
    textMuted: "#aab2c1",
    accent: "#f6a97e",
    accentSoft: "rgba(246, 169, 126, 0.18)",
    onAccent: "#1d2230",
    ok: "#7fd3a1",
    warn: "#f0c26b",
    danger: "#f28b82",
    shadow: "0 12px 32px rgba(10, 14, 24, 0.5)",
    scrim: "rgba(20, 24, 36, 0.6)",
    scheme: "dark",
  },
  "water-tower": {
    canvas: "#302723",
    surface: "#3a302b",
    panel: "#443831",
    raised: "#52453e",
    hover: "rgba(255, 235, 220, 0.05)",
    border: "#5a4d45",
    text: "#f3ebe3",
    textMuted: "#b9a99c",
    accent: "#8fc9f0",
    accentSoft: "rgba(143, 201, 240, 0.18)",
    onAccent: "#1f1815",
    ok: "#86cf9c",
    warn: "#efc06a",
    danger: "#f28b78",
    shadow: "0 12px 32px rgba(15, 8, 5, 0.5)",
    scrim: "rgba(25, 15, 10, 0.6)",
    scheme: "dark",
  },
  streetlight: {
    canvas: "#15110c",
    surface: "#1c1710",
    panel: "#251e15",
    raised: "#322a1e",
    hover: "rgba(255, 200, 120, 0.05)",
    border: "#3d3324",
    text: "#f3e6cf",
    textMuted: "#b39f7e",
    accent: "#f5a524",
    accentSoft: "rgba(245, 165, 36, 0.18)",
    onAccent: "#1c1710",
    ok: "#a8c96a",
    warn: "#f5a524",
    danger: "#f0705a",
    shadow: "0 12px 32px rgba(5, 3, 0, 0.6)",
    scrim: "rgba(10, 6, 0, 0.65)",
    scheme: "dark",
  },
  neon: {
    canvas: "#0a0b12",
    surface: "#0f1019",
    panel: "#161724",
    raised: "#222436",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#2c2e45",
    text: "#f0eef8",
    textMuted: "#9c9ab8",
    accent: "#ff5fb0",
    accentSoft: "rgba(255, 95, 176, 0.18)",
    onAccent: "#0f1019",
    ok: "#4be3c0",
    warn: "#ffcf4d",
    danger: "#ff6b6b",
    shadow: "0 16px 40px rgba(0, 0, 10, 0.7)",
    scrim: "rgba(5, 5, 15, 0.7)",
    scheme: "dark",
  },
  ferry: {
    canvas: "#0b1a1f",
    surface: "#10232a",
    panel: "#162e36",
    raised: "#224048",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#2b4a53",
    text: "#e6f0f2",
    textMuted: "#93b0b7",
    accent: "#ff9142",
    accentSoft: "rgba(255, 145, 66, 0.18)",
    onAccent: "#0b1a1f",
    ok: "#62cf9a",
    warn: "#f2c14e",
    danger: "#f27a6a",
    shadow: "0 12px 32px rgba(0, 10, 14, 0.6)",
    scrim: "rgba(3, 12, 16, 0.62)",
    scheme: "dark",
  },
  "bike-lane": {
    canvas: "#17181a",
    surface: "#1e1f22",
    panel: "#26282c",
    raised: "#323539",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#383b40",
    text: "#f2f2f0",
    textMuted: "#9ea1a5",
    accent: "#58d478",
    accentSoft: "rgba(88, 212, 120, 0.16)",
    onAccent: "#17181a",
    ok: "#58d478",
    warn: "#f0c541",
    danger: "#ff6b5e",
    shadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
    scrim: "rgba(0, 0, 0, 0.6)",
    scheme: "dark",
  },
  crosswalk: {
    canvas: "#191b1e",
    surface: "#202226",
    panel: "#282b30",
    raised: "#34383e",
    hover: "rgba(255, 255, 255, 0.04)",
    border: "#3c4047",
    text: "#f2f2ee",
    textMuted: "#a0a4aa",
    accent: "#c9e550",
    accentSoft: "rgba(201, 229, 80, 0.16)",
    onAccent: "#191b1e",
    ok: "#7fc6f2",
    warn: "#c9e550",
    danger: "#f27a3d",
    shadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
    scrim: "rgba(0, 0, 0, 0.6)",
    scheme: "dark",
  },
  concrete: {
    canvas: "#161616",
    surface: "#1c1c1c",
    panel: "#242424",
    raised: "#303030",
    hover: "rgba(255, 255, 255, 0.045)",
    border: "#3a3a3a",
    text: "#d4d4d4",
    textMuted: "#8f8f8f",
    accent: "#ffffff",
    accentSoft: "rgba(255, 255, 255, 0.14)",
    onAccent: "#161616",
    ok: "#8fbf9a",
    warn: "#d9b96a",
    danger: "#d98080",
    shadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
    scrim: "rgba(0, 0, 0, 0.65)",
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
