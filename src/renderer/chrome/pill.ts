// The strip's one update pill, with two reasons to show: a downloaded
// version waiting on a restart, or a server ahead of this app, which
// sends the person to About. The restart wins when both hold.
export interface Pill {
  hidden: boolean;
  text: string;
  title: string;
}

export function updatePill(update: string | null, newer: boolean): Pill {
  if (update)
    return {
      hidden: false,
      text: "Restart to update",
      title: `Stoop ${update} is downloaded and installs when the app restarts.`,
    };
  return {
    hidden: !newer,
    text: "Update the app",
    title:
      "This server is newer than this app. Update the app to use everything it offers.",
  };
}
