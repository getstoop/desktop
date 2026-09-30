import { afterEach, describe, expect, it, vi } from "vitest";
import { meetsMinimum, normalizeServerUrl, probeServer } from "./probe";

describe("normalizeServerUrl", () => {
  it("adds https:// when no scheme was typed", () => {
    expect(normalizeServerUrl("chat.example.com")).toBe(
      "https://chat.example.com",
    );
  });

  it("keeps http:// as given", () => {
    expect(normalizeServerUrl("http://localhost:8091")).toBe(
      "http://localhost:8091",
    );
  });

  it("keeps the port and drops the path, query and fragment", () => {
    expect(
      normalizeServerUrl("https://chat.example.com:8443/join/CODE?x=1#top"),
    ).toBe("https://chat.example.com:8443");
  });

  it("trims whitespace and lowercases the host", () => {
    expect(normalizeServerUrl("  HTTPS://Chat.Example.COM  ")).toBe(
      "https://chat.example.com",
    );
  });

  it("returns null for nothing", () => {
    expect(normalizeServerUrl("")).toBeNull();
    expect(normalizeServerUrl("   ")).toBeNull();
  });

  it("returns null for schemes other than http and https", () => {
    expect(normalizeServerUrl("ftp://chat.example.com")).toBeNull();
    expect(normalizeServerUrl("file:///etc/hosts")).toBeNull();
    expect(normalizeServerUrl("javascript://alert(1)")).toBeNull();
  });

  it("returns null for what is not a URL", () => {
    expect(normalizeServerUrl("not a url")).toBeNull();
    expect(normalizeServerUrl("https://")).toBeNull();
  });
});

describe("meetsMinimum", () => {
  it("passes the minimum and anything above it", () => {
    expect(meetsMinimum("0.1.0")).toBe(true);
    expect(meetsMinimum("0.1.1")).toBe(true);
    expect(meetsMinimum("0.2.0")).toBe(true);
    expect(meetsMinimum("1.0.0")).toBe(true);
  });

  it("fails anything below it", () => {
    expect(meetsMinimum("0.0.9")).toBe(false);
    expect(meetsMinimum("0.0.0")).toBe(false);
  });

  it("reads a v prefix and ignores a suffix", () => {
    expect(meetsMinimum("v0.1.0")).toBe(true);
    expect(meetsMinimum("v0.0.1")).toBe(false);
    expect(meetsMinimum("0.1.0-rc.1")).toBe(true);
    expect(meetsMinimum("0.0.1+build.7")).toBe(false);
  });

  it("passes a build without a stamp", () => {
    expect(meetsMinimum("dev")).toBe(true);
    expect(meetsMinimum("")).toBe(true);
    expect(meetsMinimum("abc123")).toBe(true);
  });
});

describe("probeServer", () => {
  const origin = "https://chat.example.com";

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

  const version = (body: unknown) =>
    vi.fn().mockResolvedValueOnce(json(body)).mockResolvedValue(json({}));

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks GET /version, then the instance for its name", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json({ name: "stoop", version: "0.3.0", bridge: 5 }),
      )
      .mockResolvedValueOnce(json({ instanceName: "The Stoop" }));
    vi.stubGlobal("fetch", fetch);

    await expect(probeServer(origin)).resolves.toEqual({
      ok: true,
      version: "0.3.0",
      bridge: 5,
      name: "The Stoop",
    });
    expect(fetch.mock.calls[0][0]).toBe(`${origin}/version`);
    expect(fetch.mock.calls[1][0]).toBe(
      `${origin}/stoop.instance.v1.InstanceService/GetInstanceStatus`,
    );
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "POST" });
  });

  it("reads bridge 0 from a server that publishes none", async () => {
    vi.stubGlobal("fetch", version({ name: "stoop", version: "0.1.0" }));
    await expect(probeServer(origin)).resolves.toMatchObject({
      ok: true,
      bridge: 0,
    });
  });

  it("names the server by host when the instance does not answer", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ name: "stoop", version: "0.3.0" }))
      .mockRejectedValueOnce(new Error("boom"));
    vi.stubGlobal("fetch", fetch);
    await expect(probeServer(origin)).resolves.toMatchObject({
      ok: true,
      name: "chat.example.com",
    });
  });

  it("names the server by host when the instance name is empty", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ name: "stoop", version: "0.3.0" }))
      .mockResolvedValueOnce(json({ instanceName: "" }));
    vi.stubGlobal("fetch", fetch);
    await expect(probeServer(origin)).resolves.toMatchObject({
      name: "chat.example.com",
    });
  });

  it("is not Stoop when /version is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );
    await expect(probeServer(origin)).resolves.toEqual({
      ok: false,
      kind: "not-stoop",
      detail: `Got 200 text/html from ${origin}/version`,
    });
  });

  it("is not Stoop when /version is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("", {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(probeServer(origin)).resolves.toMatchObject({
      ok: false,
      kind: "not-stoop",
      detail: `Got 404 application/json from ${origin}/version`,
    });
  });

  it("is not Stoop when the JSON does not parse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{not json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(probeServer(origin)).resolves.toEqual({
      ok: false,
      kind: "not-stoop",
      detail: `${origin}/version is not JSON`,
    });
  });

  it("is not Stoop when the JSON says something else", async () => {
    vi.stubGlobal("fetch", version({ name: "other", version: "1.0.0" }));
    await expect(probeServer(origin)).resolves.toMatchObject({
      ok: false,
      kind: "not-stoop",
      detail: `${origin}/version answered, but not as Stoop`,
    });
    vi.stubGlobal("fetch", version({ name: "stoop", version: 3 }));
    await expect(probeServer(origin)).resolves.toMatchObject({
      kind: "not-stoop",
    });
  });

  it("is unreachable when the connection is refused", async () => {
    const err = new TypeError("fetch failed", {
      cause: { code: "ECONNREFUSED" },
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    await expect(probeServer(origin)).resolves.toEqual({
      ok: false,
      kind: "unreachable",
      detail:
        "Connection refused. Check the address, or that the server is running.",
    });
  });

  it("is unreachable when the host does not resolve", async () => {
    const err = new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    await expect(probeServer(origin)).resolves.toMatchObject({
      kind: "unreachable",
      detail: "That host name does not resolve. Check the address.",
    });
  });

  it("is unreachable when the server does not answer in time", async () => {
    const err = new Error("The operation was aborted due to timeout");
    err.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    await expect(probeServer(origin)).resolves.toMatchObject({
      kind: "unreachable",
      detail: "No answer within six seconds.",
    });
  });

  it("passes any other failure through in words", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("certificate has expired")),
    );
    await expect(probeServer(origin)).resolves.toMatchObject({
      kind: "unreachable",
      detail: "certificate has expired",
    });
  });
});
