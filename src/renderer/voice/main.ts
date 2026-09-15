import type { ChromeVoice, VoiceAction } from "../../shared/bridge";
import { followTheme } from "../theme";
import { ALERT, ARROW, CAMERA, MIC, SCREEN, SLASH, svg } from "../voiceIcons";

followTheme();

const panel = document.getElementById("panel") as HTMLDivElement;
const channel = document.getElementById("channel") as HTMLElement;
const where = document.getElementById("where") as HTMLSpanElement;
const rows = document.getElementById("rows") as HTMLDivElement;
const go = document.getElementById("go") as HTMLButtonElement;
const backdrop = document.getElementById("backdrop") as HTMLDivElement;

// Every button acts on the call where it is; only Go switches servers.
function draw(v: ChromeVoice) {
  channel.textContent = v.channel;
  where.textContent = v.where;
  rows.replaceChildren();
  if (v.kind === "error") {
    rows.append(row("error", ALERT, "Couldn't join voice"));
  } else if (v.kind === "joining") {
    rows.append(row("", MIC, "Joining…"));
  } else {
    if (v.screen)
      rows.append(
        row("screen", SCREEN, "Sharing your screen", "Stop", "stop-screen"),
      );
    rows.append(
      v.camera
        ? row("live", CAMERA, "Camera on", "Turn off", "camera-off")
        : row("", CAMERA + SLASH, "Camera off", "Turn on", "camera-on"),
      v.mic
        ? row("live", MIC, "Microphone live", "Mute", "mute")
        : row("", MIC + SLASH, "Microphone muted", "Unmute", "unmute"),
    );
  }
  go.innerHTML = `${svg(ARROW, 16)}<span></span>`;
  (go.lastElementChild as HTMLSpanElement).textContent = `Go to ${v.channel}`;
  if (!panel.contains(document.activeElement)) panel.focus();
}

function row(
  className: string,
  icon: string,
  label: string,
  action?: string,
  sends?: VoiceAction,
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `voice-row ${className}`;
  el.innerHTML = svg(icon, 16);
  const text = document.createElement("span");
  text.className = "voice-label";
  text.textContent = label;
  el.append(text);
  if (action && sends) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action;
    button.addEventListener("click", () =>
      window.shell.voicePanelAction(sends),
    );
    el.append(button);
  }
  return el;
}

go.addEventListener("click", () => window.shell.voicePanelAction("show"));
backdrop.addEventListener("click", () => window.shell.closeVoicePanel());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") window.shell.closeVoicePanel();
});
window.addEventListener("blur", () => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
});

window.shell.onVoicePanel(draw);
