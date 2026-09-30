import { describe, expect, it } from "vitest";
import { updatePill } from "./pill";

describe("updatePill", () => {
  it("is hidden with nothing to say", () => {
    expect(updatePill(null, false).hidden).toBe(true);
  });

  it("sends a person to update when the server is ahead", () => {
    expect(updatePill(null, true)).toEqual({
      hidden: false,
      text: "Update the app",
      title:
        "This server is newer than this app. Update the app to use everything it offers.",
    });
  });

  it("offers the restart once a version is downloaded", () => {
    expect(updatePill("0.2.0", false)).toEqual({
      hidden: false,
      text: "Restart to update",
      title: "Stoop 0.2.0 is downloaded and installs when the app restarts.",
    });
  });

  it("prefers the restart when both hold", () => {
    expect(updatePill("0.2.0", true).text).toBe("Restart to update");
  });
});
