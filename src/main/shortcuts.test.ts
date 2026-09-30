import { describe, expect, it } from "vitest";
import { serverAccelerator, serverHint } from "./shortcuts";

describe("serverAccelerator", () => {
  it("binds the first nine servers to 1 through 9", () => {
    expect(serverAccelerator(0)).toBe("CmdOrCtrl+1");
    expect(serverAccelerator(8)).toBe("CmdOrCtrl+9");
  });

  it("binds nothing past the ninth", () => {
    expect(serverAccelerator(9)).toBeUndefined();
    expect(serverAccelerator(20)).toBeUndefined();
  });
});

describe("serverHint", () => {
  it("prints the key the way each platform shows it", () => {
    expect(serverHint(0, true)).toBe("⌘1");
    expect(serverHint(0, false)).toBe("Ctrl+1");
    expect(serverHint(8, true)).toBe("⌘9");
  });

  it("prints nothing past the ninth", () => {
    expect(serverHint(9, true)).toBe("");
    expect(serverHint(9, false)).toBe("");
  });
});
