import type { Probe } from "../shared/bridge";

// Servers older than this get the "needs updating" page. It is the first
// version that publishes GET /version; a dev build passes.
export const MIN_SERVER_VERSION = "0.1.0";

// Turns whatever was typed into an origin: adds https:// when no scheme
// was given, drops any path. Returns null when it is not a URL at all.
export function normalizeServerUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const withScheme = /^[a-z]+:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

// Asks a server what it is. GET /version says whether it is Stoop and
// which version; the instance status gives its name for the menu.
export async function probeServer(origin: string): Promise<Probe> {
  let res: Response;
  try {
    res = await fetch(`${origin}/version`, {
      signal: AbortSignal.timeout(6000),
      headers: { accept: "application/json" },
    });
  } catch (err) {
    return { ok: false, kind: "unreachable", detail: describe(err) };
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("application/json")) {
    return {
      ok: false,
      kind: "not-stoop",
      detail: `Got ${res.status} ${type.split(";")[0] || "no content type"} from ${origin}/version`,
    };
  }
  let body: { name?: unknown; version?: unknown; bridge?: unknown };
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      kind: "not-stoop",
      detail: `${origin}/version is not JSON`,
    };
  }
  if (body.name !== "stoop" || typeof body.version !== "string") {
    return {
      ok: false,
      kind: "not-stoop",
      detail: `${origin}/version answered, but not as Stoop`,
    };
  }
  return {
    ok: true,
    version: body.version,
    bridge: typeof body.bridge === "number" ? body.bridge : 0,
    name: await instanceName(origin),
  };
}

// The instance's name, from the same RPC the login page uses, as JSON.
// Falls back to the host when anything goes wrong; the name is cosmetic.
async function instanceName(origin: string): Promise<string> {
  try {
    const res = await fetch(
      `${origin}/stoop.instance.v1.InstanceService/GetInstanceStatus`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(6000),
      },
    );
    const body = (await res.json()) as { instanceName?: unknown };
    if (typeof body.instanceName === "string" && body.instanceName)
      return body.instanceName;
  } catch {
    // fall through
  }
  return new URL(origin).host;
}

// True when the server is at least the minimum. "dev" and anything
// unparseable pass: a build without a stamp is newer than any release.
export function meetsMinimum(version: string): boolean {
  const got = parse(version);
  const min = parse(MIN_SERVER_VERSION);
  if (!got || !min) return true;
  for (let i = 0; i < 3; i++) {
    if (got[i] !== min[i]) return got[i] > min[i];
  }
  return true;
}

function parse(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function describe(err: unknown): string {
  const cause = (err as { cause?: { code?: string } })?.cause?.code;
  if (cause === "ECONNREFUSED")
    return "Connection refused. Check the address, or that the server is running.";
  if (cause === "ENOTFOUND")
    return "That host name does not resolve. Check the address.";
  if (err instanceof Error && err.name === "TimeoutError")
    return "No answer within six seconds.";
  return err instanceof Error ? err.message : String(err);
}
