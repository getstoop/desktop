import { powerMonitor } from "electron";
import type { PresenceChoice } from "../shared/bridge";

// The status the app keeps, for every server it holds at once.
//
// A person is away, or not to be disturbed; neither is a fact about a
// server. The web app decides Away from input events reaching its own
// page, which is right in a browser and wrong here: this window holds
// several servers with one in front, and the ones behind receive no
// events at all, so a page cannot tell "this person has gone" from "this
// person is reading something else". The computer can, so it is asked
// instead. docs/architecture/desktop.md in the server repo.

const IDLE_AFTER_S = 10 * 60;
const POLL_MS = 30 * 1000;

export class StatusWatch {
  private idle = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  // `choice` is what the person picked in App settings; what the servers
  // are told is that, or Away on top of it once the computer goes quiet.
  constructor(
    private choice: PresenceChoice,
    private onChange: (status: PresenceChoice) => void,
  ) {
    this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  effective(): PresenceChoice {
    return this.idle && this.choice === "online" ? "away" : this.choice;
  }

  // Setting a status is itself proof the person is here, so idleness is
  // dropped whether or not the choice moved. Picking Online while Away is
  // being reported on top of it is the case that matters: the choice has
  // not changed, and the servers still have to be told.
  set(choice: PresenceChoice) {
    const before = this.effective();
    this.choice = choice;
    this.idle = false;
    if (this.effective() !== before) this.onChange(this.effective());
  }

  stop() {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  // A locked screen counts: the person is at neither the computer nor
  // any of the servers on it.
  private poll() {
    const state = powerMonitor.getSystemIdleState(IDLE_AFTER_S);
    const idle = state === "idle" || state === "locked";
    if (idle === this.idle) return;
    const before = this.effective();
    this.idle = idle;
    if (this.effective() !== before) this.onChange(this.effective());
  }
}
