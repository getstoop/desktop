import { describe, expect, it } from "vitest";
import {
  cssTokens,
  DEFAULT_THEME,
  isTheme,
  matchesFilter,
  PALETTES,
  resolveTheme,
  shellTheme,
  THEMES,
  themePreference,
} from "./themes";

describe("the theme table", () => {
  it("names each theme once", () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a palette for every theme and no palette without one", () => {
    const ids = THEMES.map((t) => t.id).sort();
    expect(Object.keys(PALETTES).sort()).toEqual(ids);
  });

  it("gives each palette the scheme its theme is filed under", () => {
    for (const theme of THEMES)
      expect(PALETTES[theme.id].scheme, theme.id).toBe(theme.kind);
  });

  it("defaults to a dark theme for dark and a light one for light", () => {
    const kind = (id: string) => THEMES.find((t) => t.id === id)?.kind;
    expect(isTheme(DEFAULT_THEME.theme)).toBe(true);
    expect(kind(DEFAULT_THEME.dark)).toBe("dark");
    expect(kind(DEFAULT_THEME.light)).toBe("light");
  });
});

describe("cssTokens and shellTheme", () => {
  it("names every colour as a custom property and leaves the scheme out", () => {
    const tokens = cssTokens(PALETTES.brownstone);
    expect(tokens["--canvas"]).toBe(PALETTES.brownstone.canvas);
    expect(tokens["--text-muted"]).toBe(PALETTES.brownstone.textMuted);
    expect(tokens["--on-accent"]).toBe(PALETTES.brownstone.onAccent);
    expect(Object.keys(tokens)).toHaveLength(
      Object.keys(PALETTES.brownstone).length - 1,
    );
    for (const name of Object.keys(tokens)) expect(name).toMatch(/^--/);
    expect(Object.values(tokens)).not.toContain("dark");
  });

  it("crosses the bridge as a scheme and tokens, with no name", () => {
    expect(shellTheme("daylight")).toEqual({
      scheme: "light",
      tokens: cssTokens(PALETTES.daylight),
    });
  });
});

describe("themePreference", () => {
  it("is the default for nothing at all", () => {
    expect(themePreference(undefined)).toEqual(DEFAULT_THEME);
    expect(themePreference(null)).toEqual(DEFAULT_THEME);
    expect(themePreference({})).toEqual(DEFAULT_THEME);
    expect(themePreference("brownstone")).toEqual(DEFAULT_THEME);
  });

  it("keeps a preference that is whole", () => {
    const pref = {
      mode: "system" as const,
      theme: "dusk" as const,
      dark: "nightcap" as const,
      light: "newsprint" as const,
    };
    expect(themePreference(pref)).toEqual(pref);
  });

  it("replaces each unknown field on its own", () => {
    expect(
      themePreference({ mode: "auto", theme: "sepia", dark: "dusk", light: 3 }),
    ).toEqual({
      mode: "theme",
      theme: DEFAULT_THEME.theme,
      dark: "dusk",
      light: DEFAULT_THEME.light,
    });
  });

  it("drops fields it does not know", () => {
    expect(themePreference({ ...DEFAULT_THEME, extra: true })).toEqual(
      DEFAULT_THEME,
    );
  });
});

describe("resolveTheme", () => {
  const pref = {
    mode: "theme" as const,
    theme: "dusk" as const,
    dark: "nightcap" as const,
    light: "newsprint" as const,
  };

  it("is the chosen theme whatever the OS says", () => {
    expect(resolveTheme(pref, true)).toBe("dusk");
    expect(resolveTheme(pref, false)).toBe("dusk");
  });

  it("follows the OS between the pair in system mode", () => {
    const system = { ...pref, mode: "system" as const };
    expect(resolveTheme(system, true)).toBe("nightcap");
    expect(resolveTheme(system, false)).toBe("newsprint");
  });
});

describe("matchesFilter", () => {
  const theme = THEMES[0];

  it("answers to all, its tier and its tags", () => {
    expect(matchesFilter(theme, "all")).toBe(true);
    expect(matchesFilter(theme, theme.tier)).toBe(true);
    const tagged = THEMES.find((t) => t.tags?.includes("accessible"));
    expect(tagged).toBeDefined();
    if (tagged) expect(matchesFilter(tagged, "accessible")).toBe(true);
  });

  it("answers to nothing else", () => {
    const other = (["light", "dim", "dark"] as const).find(
      (tier) => tier !== theme.tier,
    );
    if (other) expect(matchesFilter(theme, other)).toBe(false);
    const untagged = THEMES.find((t) => !t.tags?.length);
    if (untagged) expect(matchesFilter(untagged, "accessible")).toBe(false);
  });
});
