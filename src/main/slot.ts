import { join } from "node:path";
import {
  app,
  type BrowserWindow,
  session,
  shell,
  WebContentsView,
} from "electron";
import type { Palette, VoiceReport } from "../shared/bridge";
import { IPC } from "../shared/bridge";
import type { ThemeId } from "../shared/themes";
import { answerScreenShare } from "./screenshare";
import { partitionFor, type Server } from "./servers";
import type { Settings } from "./settings";
import { shellTheme } from "./theme";

// One server's place in the window: its own session, the view its web
// app loads into, and what the window has learned about it since.

const bridgePreload = join(__dirname, "../preload/bridge.js");

export interface Slot {
  server: Server;
  view: WebContentsView;
  badge: number;
  // Whether the server's web app is loaded, or the gate page stands in.
  loaded: boolean;
  gated: boolean;
  probedAt: number;
  // Why the gate page stands in, for showing it again on a switch.
  gate?: { kind: string; detail: string };
  // The server publishes a bridge level above what this app implements.
  newer: boolean;
  version: string;
  // URL a deep link asked for, loaded by the next checkAndLoad.
  pending?: string;
  // What the page says it captures; null outside voice.
  voice: VoiceReport | null;
  // When its current call started, so the latest call speaks for the strip.
  joinedAt: number;
}

// What a slot reads from the window as it is made, and what it tells the
// window afterwards.
export interface SlotHost {
  win: BrowserWindow;
  palette(): Palette;
  theme(): ThemeId;
  settings(): Settings;
  bannersAllowed(): boolean;
  // The page reloaded, navigated away or crashed.
  left(slot: Slot): void;
  // The main frame failed to load.
  failed(slot: Slot, detail: string): void;
  // The page took the focus.
  focused(slot: Slot): void;
}

// Makes the server's view, hidden and not yet loaded or placed: the
// window adds it, lays it out and asks the server what it is.
export function makeSlot(server: Server, host: SlotHost): Slot {
  const ses = session.fromPartition(partitionFor(server));
  answerScreenShare(
    ses,
    () => (host.win.isDestroyed() ? null : host.win),
    () => host.palette(),
  );
  ses.setUserAgent(desktopUserAgent(ses.getUserAgent()));
  const view = new WebContentsView({
    webPreferences: {
      session: ses,
      preload: bridgePreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The preload reads these back: the version so window.stoop and
      // the user agent name the same build, the theme so the page's
      // first paint is already in it.
      additionalArguments: [
        `--stoop-desktop-version=${app.getVersion()}`,
        `--stoop-theme=${encodeURIComponent(JSON.stringify(shellTheme(host.theme())))}`,
        `--stoop-notifications=${host.bannersAllowed()}`,
        `--stoop-voice-cues=${host.settings().voiceCues}`,
      ],
    },
  });
  view.setBackgroundColor(host.palette().canvas);
  const slot: Slot = {
    server,
    view,
    badge: 0,
    loaded: false,
    gated: false,
    probedAt: 0,
    newer: false,
    version: "",
    voice: null,
    joinedAt: 0,
  };
  const wc = view.webContents;
  wc.on("did-start-navigation", (details) => {
    if (details.isMainFrame && !details.isSameDocument) host.left(slot);
  });
  wc.on("render-process-gone", () => host.left(slot));
  wc.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-navigate", (event, next) => {
    if (new URL(next).origin !== server.url) {
      event.preventDefault();
      void shell.openExternal(next);
    }
  });
  // The theme may have moved between the view being made and the page
  // loading; the page listens from its first script, so saying it
  // again here lands.
  wc.on("did-finish-load", () => {
    wc.send(IPC.stoopTheme, shellTheme(host.theme()));
  });
  wc.on("did-fail-load", (_event, code, description, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    host.failed(slot, `${description} (${code})`);
  });
  // A notification click calls window.focus() inside the page, which
  // is this event.
  wc.on("focus", () => host.focused(slot));
  view.setVisible(false);
  return slot;
}

// A standard Chrome user agent with our marker appended, as the
// contract says (docs/architecture/desktop.md). Electron's default
// names Electron and the package, which is what identity providers
// key on to refuse an embedded browser.
export function desktopUserAgent(base: string): string {
  const chrome = base
    .replace(/\s?Electron\/\S+/, "")
    .replace(/\s?stoop-desktop\/\S+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return `${chrome} Stoop-Desktop/${app.getVersion()}`;
}
