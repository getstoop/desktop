import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadServers, newServer, partitionFor, saveServers } from "./servers";

const electron = vi.hoisted(() => ({ userData: "" }));

vi.mock("electron", () => ({
  app: { getPath: () => electron.userData },
}));

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "stoop-servers-"));
  electron.userData = root;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("the server list", () => {
  it("is empty when nothing was saved", () => {
    expect(loadServers()).toEqual([]);
  });

  it("is empty when the file has no list in it", () => {
    writeFileSync(join(root, "servers.json"), "{}");
    expect(loadServers()).toEqual([]);
    writeFileSync(join(root, "servers.json"), '{"servers": "x"}');
    expect(loadServers()).toEqual([]);
    writeFileSync(join(root, "servers.json"), "[");
    expect(loadServers()).toEqual([]);
  });

  it("reads back what was saved, in order", () => {
    electron.userData = join(root, "fresh");
    const servers = [
      newServer("https://chat.example.com", "The Stoop"),
      newServer("http://localhost:8091", "localhost:8091"),
    ];
    saveServers(servers);
    expect(loadServers()).toEqual(servers);
  });
});

describe("newServer", () => {
  it("gives each server its own id", () => {
    const a = newServer("https://chat.example.com", "A");
    const b = newServer("https://chat.example.com", "A");
    expect(a).toMatchObject({ url: "https://chat.example.com", name: "A" });
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("partitionFor", () => {
  it("is persisted and named for the server alone", () => {
    const server = newServer("https://chat.example.com", "A");
    expect(partitionFor(server)).toBe(`persist:server-${server.id}`);
  });
});
