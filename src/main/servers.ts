import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

// The list of servers this computer knows, kept as one JSON file in the
// app's data directory. Nothing about the person's account lives here;
// each server's session cookie lives in that server's own partition.

export interface Server {
  id: string;
  url: string; // origin, no trailing slash
  name: string;
}

const file = () => join(app.getPath("userData"), "servers.json");

export function loadServers(): Server[] {
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8"));
    return Array.isArray(raw.servers) ? raw.servers : [];
  } catch {
    return [];
  }
}

export function saveServers(servers: Server[]) {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(file(), JSON.stringify({ servers }, null, 2));
}

export function newServer(url: string, name: string): Server {
  return { id: randomUUID(), url, name };
}

// The session partition for one server: persisted, and never shared.
export function partitionFor(server: Server): string {
  return `persist:server-${server.id}`;
}
