import { globalShortcut } from "electron";
import type { VoiceReport } from "../shared/bridge";
import { isKeyDown, keyAccess } from "./keys";

// Push to talk from any app: while it is on and a server is in a call,
// holding Ctrl+` unmutes that call and letting go mutes it again. It only
// sends the voice actions the Voice menu sends, so the page does what it
// always does with them (unmuting undeafens). It acts only when the call
// is muted to begin with, so it never mutes a mic opened on purpose.
//
// The press comes from globalShortcut, which reports it from any app but
// never the release; the release is read off the keys themselves
// (keys.ts), polled while the hold lasts.

export const ACCELERATOR = "Control+`";
// How long after the key comes up the mute is sent, so the last syllable
// is not clipped. The page's own listener waits the same.
export const RELEASE_TAIL_MS = 50;
export const POLL_MS = 15;

export interface HoldDeps {
  muted: () => boolean;
  held: () => boolean;
  send: (action: "mute" | "unmute") => void;
}

export interface Hold {
  press: () => void;
  // Push to talk is going away mid-hold: mute now.
  stop: () => void;
}

export function createHold(
  deps: HoldDeps,
  pollMs = POLL_MS,
  tailMs = RELEASE_TAIL_MS,
): Hold {
  let poll: ReturnType<typeof setInterval> | null = null;
  let tail: ReturnType<typeof setTimeout> | null = null;
  const watch = () => {
    poll = setInterval(() => {
      if (deps.held()) return;
      if (poll) clearInterval(poll);
      poll = null;
      tail = setTimeout(() => {
        tail = null;
        deps.send("mute");
      }, tailMs);
    }, pollMs);
  };
  return {
    press() {
      if (poll) return;
      // Pressed again inside the tail: the same hold carries on.
      if (tail) {
        clearTimeout(tail);
        tail = null;
        watch();
        return;
      }
      if (!deps.muted()) return;
      deps.send("unmute");
      watch();
    },
    stop() {
      if (!poll && !tail) return;
      if (poll) clearInterval(poll);
      if (tail) clearTimeout(tail);
      poll = tail = null;
      deps.send("mute");
    },
  };
}

// Muted in a call that is up. A report is what the page last said, so it
// can trail a click by a moment; the actions it leads to ask for a state
// rather than flip one, so a late one does nothing.
export function callMuted(voice: VoiceReport | null): boolean {
  return (
    !!voice && voice.kind !== "joining" && voice.kind !== "error" && !voice.mic
  );
}

export class PushToTalk {
  private hold: Hold;
  private registered = false;

  constructor(
    voice: () => VoiceReport | null,
    send: (action: "mute" | "unmute") => void,
  ) {
    this.hold = createHold({
      muted: () => callMuted(voice()),
      held: () => isKeyDown("backquote") && isKeyDown("control"),
      send,
    });
  }

  // Listen while push to talk is on and a call is up, and only once the
  // keys can be read: without them the release could never be seen.
  sync(on: boolean) {
    const want = on && keyAccess() === "granted";
    if (want === this.registered) return;
    if (want) {
      this.registered = globalShortcut.register(ACCELERATOR, () =>
        this.hold.press(),
      );
    } else {
      globalShortcut.unregister(ACCELERATOR);
      this.registered = false;
      this.hold.stop();
    }
  }
}
