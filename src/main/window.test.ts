import { describe, expect, it, vi } from "vitest";
import { desktopUserAgent } from "./window";

vi.mock("electron", () => ({
  app: { getVersion: () => "0.1.0" },
}));

const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

describe("desktopUserAgent", () => {
  it("drops Electron's own marks and appends ours", () => {
    const electron =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) stoop-desktop/0.1.0 Chrome/134.0.0.0 Electron/35.0.0 Safari/537.36";
    expect(desktopUserAgent(electron)).toBe(`${chrome} Stoop-Desktop/0.1.0`);
  });

  it("leaves a plain Chrome user agent as it is, marked", () => {
    expect(desktopUserAgent(chrome)).toBe(`${chrome} Stoop-Desktop/0.1.0`);
  });

  it("names neither Electron nor the package", () => {
    const out = desktopUserAgent(
      `${chrome} Electron/35.0.0 stoop-desktop/0.1.0`,
    );
    expect(out).not.toMatch(/Electron/);
    expect(out).not.toMatch(/stoop-desktop/);
    expect(out).not.toMatch(/\s{2,}/);
    expect(out.endsWith(" Stoop-Desktop/0.1.0")).toBe(true);
  });
});
