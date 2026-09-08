import { normalizeServerUrl } from "./probe";

// A stoop:// link, arriving from the operating system: an invite page in
// a browser, a sign-in handed back from one, a link in a message. None
// of it is trusted, so this file turns the text into one of two shapes
// or into nothing at all. It imports no Electron, so what it decides can
// be read without starting an app.
//
//   stoop://open?server=<origin>&path=<path>
//   stoop://auth?server=<origin>&code=<code>
//
// Every path the web app routes is a valid target; the shell never
// interprets one. docs/architecture/desktop.md in the server repo.

export const SCHEME = "stoop";

export type DeepLink =
  | { action: "open"; server: string; path: string }
  | { action: "auth"; server: string; code: string };

// Long enough for any path the web app routes, short enough that a link
// cannot be a payload.
const MAX_LINK = 2048;
const MAX_CODE = 512;

export function parseDeepLink(raw: string): DeepLink | null {
  if (!raw || raw.length > MAX_LINK) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${SCHEME}:`) return null;
  // stoop://open?… parses with "open" as the host, stoop:open?… with it
  // as the path. Take either, so a link that skipped the slashes lands.
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

// A path, and only a path. "//elsewhere.example" is a URL wearing a
// path's clothes, and a backslash becomes a slash on the way into a URL,
// so "/\elsewhere.example" is the same trick spelled differently.
function safePath(raw: string | null): string | null {
  if (!raw?.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.includes("\\")) return null;
  return raw;
}

// Where a link points on the server it names. Resolving the path against
// the origin and then checking the origin again is the whole defence:
// the shell does not know what a path means, only where it must stay.
export function targetUrl(link: DeepLink, serverUrl: string): string | null {
  // The link names a server and the caller passes the one it found. They
  // are the same by construction today; saying so here means a caller
  // that ever gets it wrong is refused rather than obeyed.
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

// Windows and Linux hand the link over as an argument, on a cold start
// and on every launch after it. Electron's own flags are in there too,
// so take the first thing that parses.
export function linkFromArgv(argv: string[]): DeepLink | null {
  for (const arg of argv) {
    if (!arg.toLowerCase().startsWith(`${SCHEME}:`)) continue;
    const link = parseDeepLink(arg);
    if (link) return link;
  }
  return null;
}
