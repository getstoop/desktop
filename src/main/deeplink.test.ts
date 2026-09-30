import { describe, expect, it } from "vitest";
import {
  type DeepLink,
  linkFromArgv,
  parseDeepLink,
  targetUrl,
} from "./deeplink";

const server = "https://chat.example.com";

describe("parseDeepLink", () => {
  it("reads an open link", () => {
    expect(
      parseDeepLink("stoop://open?server=chat.example.com&path=/join/CODE"),
    ).toEqual({ action: "open", server, path: "/join/CODE" });
  });

  it("reads an auth link", () => {
    expect(
      parseDeepLink("stoop://auth?server=chat.example.com&code=abc-123_x.y~z"),
    ).toEqual({ action: "auth", server, code: "abc-123_x.y~z" });
  });

  it("normalizes the server to its origin", () => {
    expect(
      parseDeepLink(
        "stoop://open?server=https%3A%2F%2Fchat.example.com%2Fsomewhere&path=/",
      ),
    ).toEqual({ action: "open", server, path: "/" });
  });

  it("reads the action from the path when the link has no slashes", () => {
    expect(parseDeepLink("stoop:open?server=chat.example.com&path=/")).toEqual({
      action: "open",
      server,
      path: "/",
    });
  });

  it("reads the action whatever its case", () => {
    expect(
      parseDeepLink("stoop://OPEN?server=chat.example.com&path=/"),
    ).toMatchObject({ action: "open" });
  });

  it("refuses a link with another scheme", () => {
    expect(
      parseDeepLink("https://open?server=chat.example.com&path=/"),
    ).toBeNull();
  });

  it("refuses an action it does not know", () => {
    expect(
      parseDeepLink("stoop://frob?server=chat.example.com&path=/"),
    ).toBeNull();
  });

  it("refuses a link without a usable server", () => {
    expect(parseDeepLink("stoop://open?path=/")).toBeNull();
    expect(parseDeepLink("stoop://open?server=&path=/")).toBeNull();
    expect(
      parseDeepLink("stoop://open?server=ftp://chat.example.com&path=/"),
    ).toBeNull();
  });

  it("refuses an open link whose path could leave the server", () => {
    const open = (path: string) =>
      parseDeepLink(
        `stoop://open?server=chat.example.com&path=${encodeURIComponent(path)}`,
      );
    expect(open("join/CODE")).toBeNull();
    expect(open("//evil.example.net/x")).toBeNull();
    expect(open("/a\\b")).toBeNull();
    expect(open("")).toBeNull();
    expect(parseDeepLink("stoop://open?server=chat.example.com")).toBeNull();
  });

  it("refuses an auth code that is empty, too long or oddly spelt", () => {
    const auth = (code: string) =>
      parseDeepLink(
        `stoop://auth?server=chat.example.com&code=${encodeURIComponent(code)}`,
      );
    expect(auth("")).toBeNull();
    expect(auth("a b")).toBeNull();
    expect(auth("a/b")).toBeNull();
    expect(auth("x".repeat(512))).not.toBeNull();
    expect(auth("x".repeat(513))).toBeNull();
    expect(parseDeepLink("stoop://auth?server=chat.example.com")).toBeNull();
  });

  it("refuses what is empty, too long or not a URL", () => {
    expect(parseDeepLink("")).toBeNull();
    expect(parseDeepLink("stoop")).toBeNull();
    const long = `stoop://open?server=chat.example.com&path=/${"a".repeat(2048)}`;
    expect(parseDeepLink(long)).toBeNull();
  });
});

describe("targetUrl", () => {
  it("resolves an open link on its server", () => {
    const link: DeepLink = { action: "open", server, path: "/join/CODE" };
    expect(targetUrl(link, server)).toBe(`${server}/join/CODE`);
  });

  it("resolves an auth link to the completion route", () => {
    const link: DeepLink = { action: "auth", server, code: "abc~1" };
    expect(targetUrl(link, server)).toBe(
      `${server}/auth/desktop/complete?code=abc~1`,
    );
  });

  it("refuses a server other than the one the link names", () => {
    const link: DeepLink = { action: "open", server, path: "/" };
    expect(targetUrl(link, "https://other.example.com")).toBeNull();
  });

  it("refuses a path that would resolve to another origin", () => {
    const link: DeepLink = {
      action: "open",
      server,
      path: "//evil.example.net/x",
    };
    expect(targetUrl(link, server)).toBeNull();
  });
});

describe("linkFromArgv", () => {
  it("finds the link among the other arguments", () => {
    expect(
      linkFromArgv([
        "/usr/bin/stoop",
        "--no-sandbox",
        "stoop://open?server=chat.example.com&path=/",
      ]),
    ).toEqual({ action: "open", server, path: "/" });
  });

  it("matches the scheme whatever its case", () => {
    expect(
      linkFromArgv(["STOOP://open?server=chat.example.com&path=/"]),
    ).toMatchObject({ action: "open" });
  });

  it("skips an argument that only looks like a link", () => {
    expect(
      linkFromArgv([
        "stoop://frob?server=chat.example.com",
        "stoop://auth?server=chat.example.com&code=ok",
      ]),
    ).toEqual({ action: "auth", server, code: "ok" });
  });

  it("returns null when no argument is one", () => {
    expect(linkFromArgv([])).toBeNull();
    expect(linkFromArgv(["/usr/bin/stoop", "--flag"])).toBeNull();
  });
});
