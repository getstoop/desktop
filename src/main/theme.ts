import type { Palette } from "../shared/bridge";

// The web app publishes one colour: the active theme's --canvas, as
// theme-color. The rest of what the shell's own pages need is derived
// from it, in HSL so a tinted theme stays tinted — mixing toward white
// washes the hue out, which is what made an early version look grey
// beside a purple app.
const BROWNSTONE = "#141517";

interface Hsl {
  h: number;
  s: number;
  l: number;
}

// Lightness steps off the canvas, and the flat lightness text sits at.
// Light themes lift their surfaces toward white and darken the border;
// dark ones lift everything.
const DARK = {
  surface: 3.5,
  panel: 7,
  raised: 12,
  border: 16,
  text: 92,
  muted: 64,
};
const LIGHT = {
  surface: 5,
  panel: 10,
  raised: 1,
  border: -7.5,
  text: 11.5,
  muted: 38,
};

export function derivePalette(canvas: string | undefined): Palette {
  const base = toHsl(parse(canvas) ?? parse(BROWNSTONE));
  const light = base.l > 60;
  const step = light ? LIGHT : DARK;
  const shade = (delta: number) => ({ ...base, l: base.l + delta });
  const panel = shade(step.panel);
  const text = { h: base.h, s: base.s * 0.7, l: step.text };
  return {
    canvas: hex(base),
    surface: hex(shade(step.surface)),
    panel: hex(panel),
    raised: hex(shade(step.raised)),
    border: hex(shade(step.border)),
    text: hex(readable(text, panel, light)),
    textMuted: hex({ h: base.h, s: base.s * 0.5, l: step.muted }),
    scheme: light ? "light" : "dark",
  };
}

// Body text has to hold up against the panel it sits on whatever the
// theme colour was, so it keeps moving until it does.
function readable(text: Hsl, panel: Hsl, light: boolean): Hsl {
  let out = text;
  for (let i = 0; i < 12 && contrast(out, panel) < 4.5; i++) {
    out = { ...out, l: out.l + (light ? -4 : 4) };
  }
  return out;
}

// ---- colour ----

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parse(value: string | undefined): Rgb {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(value?.trim() ?? "");
  if (!m) return { r: 20, g: 21, b: 23 };
  const digits =
    m[1].length === 3
      ? m[1]
          .split("")
          .map((d) => d + d)
          .join("")
      : m[1];
  const n = Number.parseInt(digits, 16);
  return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 };
}

function toHsl({ r, g, b }: Rgb): Hsl {
  const [x, y, z] = [r / 255, g / 255, b / 255];
  const max = Math.max(x, y, z);
  const min = Math.min(x, y, z);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === x
      ? ((y - z) / d) % 6
      : max === y
        ? (z - x) / d + 2
        : (x - y) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

function toRgb({ h, s, l }: Hsl): Rgb {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hex(c: Hsl): string {
  const { r, g, b } = toRgb(c);
  const part = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// WCAG relative luminance and contrast ratio.
function luminance(c: Hsl): number {
  const { r, g, b } = toRgb(c);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Hsl, b: Hsl): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
