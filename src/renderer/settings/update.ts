import type { UpdateState } from "../../shared/bridge";

// About's line on the app's next version, and the one thing to do about
// it: check, try again, or restart. Kept apart from the page so the
// wording can be tested without a DOM.
export interface UpdateLine {
  text: string;
  // The button's label, or null for no button.
  action: string | null;
}

// `deb` is an install that asks for the password; `when` says a time.
export function updateLine(
  state: UpdateState,
  deb: boolean,
  when: (epochMs: number) => string,
): UpdateLine {
  switch (state.kind) {
    case "off":
      return {
        text: "A build run from a checkout. It does not update itself.",
        action: null,
      };
    case "idle":
      return {
        text:
          state.checkedAt === null
            ? "Checks for a new version soon after it starts and every few hours, and downloads one in the background."
            : `Up to date, as of ${when(state.checkedAt)}.`,
        action: "Check now",
      };
    case "checking":
      return { text: "Checking…", action: null };
    case "downloading":
      return {
        text: `Downloading Stoop ${state.version}… ${state.percent}%`,
        action: null,
      };
    case "ready":
      return {
        text: `Stoop ${state.version} is downloaded. It installs when the app restarts${
          deb ? ", after the system asks for your password" : ""
        }.`,
        action: "Restart to update",
      };
    case "error":
      return {
        text: `Could not check for updates. ${state.detail}`,
        action: "Try again",
      };
  }
}
