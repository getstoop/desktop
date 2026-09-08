/**
 * Parses a stoop:// link into one of two shapes, or into null.
 *
 * ```
 * stoop://open?server=<origin>&path=<path>
 * stoop://auth?server=<origin>&code=<code>
 * ```
 *
 * Imports no Electron. docs/architecture/desktop.md in the server repo.
 *
 * @module
 */

import { normalizeServerUrl } from "./probe";

export const SCHEME = "stoop";

/** A parsed link: an `open` target, or an `auth` hand-back. */
export type DeepLink =
  | { action: "open"; server: string; path: string }
  | { action: "auth"; server: string; code: string };

/** Caps on the whole link and on an auth code. */
const MAX_LINK = 2048;
const MAX_CODE = 512;

/**
 * @param raw - the link as the operating system delivered it
 * @returns the link, or null when it is not one this shell acts on
 */
export function parseDeepLink(raw: string): DeepLink | null {
  if (!raw || raw.length > MAX_LINK) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${SCHEME}:`) return null;
  // stoop://open?… puts "open" in the host, stoop:open?… in the path.
  const action = (
    url.hostname || url.pathname.replace(/^\/+/, "")
  ).toLowerCase();
  const server = normalizeServerUrl(url.searchParams.get("server") ?? "");
  if (!server) return null;
  if (action === "open") {
    const path = safePath(url.searchParams.get("path"));
    return path ? { action: "open", server, path } : null;
  }
  if (action === "auth") {
    const code = url.searchParams.get("code") ?? "";
    if (!code || code.length > MAX_CODE || !/^[\w.~-]+$/.test(code))
      return null;
    return { action: "auth", server, code };
  }
  return null;
}

/**
 * A path only: one leading slash, and no "//" or "\", each of which
 * resolves to a different origin.
 *
 * @returns the path, or null when it is not one
 */
function safePath(raw: string | null): string | null {
  if (!raw?.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.includes("\\")) return null;
  return raw;
}

/**
 * Resolves a link to an absolute URL on the server it names.
 *
 * @param serverUrl - origin of the server the caller resolved
 * @returns the absolute URL, or null when it would resolve anywhere else
 */
export function targetUrl(link: DeepLink, serverUrl: string): string | null {
  // The server the link names must be the one the caller resolved.
  if (link.server !== serverUrl) return null;
  const path =
    link.action === "open"
      ? link.path
      : `/auth/desktop/complete?code=${encodeURIComponent(link.code)}`;
  let target: URL;
  try {
    target = new URL(path, `${serverUrl}/`);
  } catch {
    return null;
  }
  return target.origin === serverUrl ? target.href : null;
}

/**
 * The first argument that parses as a link. Windows and Linux pass one in
 * argv, on a cold start and on later launches.
 *
 * @returns the link, or null when no argument is one
 */
export function linkFromArgv(argv: string[]): DeepLink | null {
  for (const arg of argv) {
    if (!arg.toLowerCase().startsWith(`${SCHEME}:`)) continue;
    const link = parseDeepLink(arg);
    if (link) return link;
  }
  return null;
}
