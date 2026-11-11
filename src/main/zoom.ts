// One zoom for the whole app. Chromium keeps zoom per site within a
// session, and every server is its own site in its own partition, so
// left alone each server would hold a different one. The app keeps the
// level in its settings and sets it on every page it shows.
//
// The value is Chromium's zoom level: 0 is actual size and each whole
// step scales by 1.2, so the half steps the menu takes are about 10%.

export const ZOOM_STEP = 0.5;
export const ZOOM_MIN = -3; // about 58%
export const ZOOM_MAX = 3; // about 173%

// A stored or asked-for level as one the app will use: anything that
// isn't a number is actual size, and the rest is held to the range.
export function zoomLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

// One menu step in or out from a level.
export function zoomStep(level: number, direction: 1 | -1): number {
  return zoomLevel(level + direction * ZOOM_STEP);
}

// A level as the percentage the menu prints: 0 is 100, -0.5 is 91.
export function zoomPercent(level: number): number {
  return Math.round(1.2 ** level * 100);
}
