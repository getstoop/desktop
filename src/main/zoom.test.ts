import { describe, expect, it } from "vitest";
import { ZOOM_MAX, ZOOM_MIN, zoomLevel, zoomPercent, zoomStep } from "./zoom";

describe("zoomLevel", () => {
  it("keeps a level inside the range", () => {
    expect(zoomLevel(-0.5)).toBe(-0.5);
    expect(zoomLevel(0)).toBe(0);
  });

  it("holds a level to the range", () => {
    expect(zoomLevel(99)).toBe(ZOOM_MAX);
    expect(zoomLevel(-99)).toBe(ZOOM_MIN);
  });

  it("reads anything that isn't a number as actual size", () => {
    expect(zoomLevel(undefined)).toBe(0);
    expect(zoomLevel("1")).toBe(0);
    expect(zoomLevel(Number.NaN)).toBe(0);
    expect(zoomLevel(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("zoomStep", () => {
  it("steps in and out by half a level", () => {
    expect(zoomStep(0, 1)).toBe(0.5);
    expect(zoomStep(0, -1)).toBe(-0.5);
  });

  it("stops at the ends of the range", () => {
    expect(zoomStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(zoomStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });
});

describe("zoomPercent", () => {
  it("is 100 at actual size", () => {
    expect(zoomPercent(0)).toBe(100);
  });

  it("rounds a level to a whole percentage", () => {
    expect(zoomPercent(-0.5)).toBe(91);
    expect(zoomPercent(0.5)).toBe(110);
    expect(zoomPercent(1)).toBe(120);
    expect(zoomPercent(ZOOM_MIN)).toBe(58);
    expect(zoomPercent(ZOOM_MAX)).toBe(173);
  });
});
