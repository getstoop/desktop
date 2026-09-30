import { describe, expect, it } from "vitest";
import { updateLine } from "./update";

const at = (ms: number) => `t${ms}`;

describe("updateLine", () => {
  it("offers nothing for a build run from a checkout", () => {
    expect(updateLine({ kind: "off" }, false, at)).toEqual({
      text: "A build run from a checkout. It does not update itself.",
      action: null,
    });
  });

  it("says what it will do before the first check, with a check to press", () => {
    const line = updateLine({ kind: "idle", checkedAt: null }, false, at);
    expect(line.text).toMatch(/^Checks for a new version/);
    expect(line.action).toBe("Check now");
  });

  it("says when it last found nothing newer", () => {
    expect(updateLine({ kind: "idle", checkedAt: 1234 }, false, at)).toEqual({
      text: "Up to date, as of t1234.",
      action: "Check now",
    });
  });

  it("has no button while checking or downloading", () => {
    expect(updateLine({ kind: "checking" }, false, at)).toEqual({
      text: "Checking…",
      action: null,
    });
    expect(
      updateLine(
        { kind: "downloading", version: "0.2.0", percent: 42 },
        false,
        at,
      ),
    ).toEqual({ text: "Downloading Stoop 0.2.0… 42%", action: null });
  });

  it("offers the restart once a version is downloaded", () => {
    expect(updateLine({ kind: "ready", version: "0.2.0" }, false, at)).toEqual({
      text: "Stoop 0.2.0 is downloaded. It installs when the app restarts.",
      action: "Restart to update",
    });
  });

  it("warns a .deb about the password prompt", () => {
    expect(updateLine({ kind: "ready", version: "0.2.0" }, true, at).text).toBe(
      "Stoop 0.2.0 is downloaded. It installs when the app restarts, after the system asks for your password.",
    );
  });

  it("carries the error and offers another go", () => {
    expect(
      updateLine(
        { kind: "error", detail: "No connection to github.com." },
        false,
        at,
      ),
    ).toEqual({
      text: "Could not check for updates. No connection to github.com.",
      action: "Try again",
    });
  });
});
