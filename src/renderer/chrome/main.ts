import type { ChromeState } from "../../shared/bridge";
import { ALERT, CAMERA, MIC, SCREEN, SLASH, svg } from "../voiceIcons";

const server = document.getElementById("server") as HTMLButtonElement;
const name = document.getElementById("name") as HTMLSpanElement;
const dot = document.getElementById("dot") as HTMLSpanElement;
const controls = document.getElementById("controls") as HTMLDivElement;
const update = document.getElementById("update") as HTMLButtonElement;
const gear = document.getElementById("gear") as HTMLButtonElement;
const voice = document.getElementById("voice") as HTMLDivElement;
const voiceOpen = document.getElementById("voice-open") as HTMLButtonElement;
const voiceIcons = document.getElementById("voice-icons") as HTMLSpanElement;
const where = document.getElementById("where") as HTMLSpanElement;
const voiceStop = document.getElementById("voice-stop") as HTMLButtonElement;
update.addEventListener("click", () => window.shell.updateApp());
voiceOpen.addEventListener("click", () => window.shell.voiceAction("open"));
voiceStop.addEventListener("click", () =>
  window.shell.voiceAction("stop-screen"),
);

server.addEventListener("click", () => window.shell.openSwitcher());

// Lit means App settings is already the page in front, and the way out of
// it is the way back in — the same journey the settings nav's own Back
// button makes.
gear.addEventListener("click", () => {
  window.shell.showPage(
    gear.getAttribute("aria-pressed") === "true" ? "back" : "settings",
  );
});
for (const button of controls.querySelectorAll<HTMLButtonElement>("button")) {
  button.addEventListener("click", () => {
    window.shell.windowAction(
      button.dataset.action as "minimize" | "maximize" | "close",
    );
  });
}

// The strip hands the keyboard to the page or the server it opened, so
// the button that was clicked should not keep looking pressed. The
// switcher panel drops its focus the same way when it loses the window.
window.addEventListener("blur", () => {
  document.body.classList.add("pointer-gone");
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
});
document.addEventListener(
  "pointermove",
  () => document.body.classList.remove("pointer-gone"),
  { passive: true },
);

window.shell.onChromeState((state) => {
  document.body.style.background = state.color;
  document.body.style.color = state.symbol;
  document.body.style.setProperty("--accent", state.accent);
  server.hidden = !state.name;
  name.textContent = state.name;
  dot.hidden = !state.dot;
  update.hidden = !state.newer;
  gear.setAttribute("aria-pressed", String(state.settings));
  const mac = state.platform === "darwin";
  gear.title = mac ? "App settings (⌘,)" : "App settings (Ctrl+,)";
  document.body.classList.toggle("no-lights", !mac);
  controls.hidden = mac;
  document.body.style.setProperty("--ok", state.ok);
  document.body.style.setProperty("--danger", state.danger);
  drawVoice(state.voice);
});

// The pill moves once when a call starts, so people see there are controls
// there; the ping ending is what clears it.
// Leaving lifts it back out before it hides.
let introducing = false;
let leaving = false;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
voice.addEventListener("animationend", (event) => {
  if (event.animationName === "voice-ping") {
    introducing = false;
    voice.classList.remove("intro");
  } else if (event.animationName === "voice-out" && leaving) {
    leaving = false;
    voice.hidden = true;
    voice.classList.remove("outro");
  }
});

function drawVoice(v: ChromeState["voice"]) {
  if (!v) {
    introducing = false;
    if (voice.hidden || leaving) return;
    if (reducedMotion.matches) {
      voice.hidden = true;
      return;
    }
    leaving = true;
    voice.classList.remove("intro");
    voice.classList.add("outro");
    return;
  }
  if (voice.hidden) introducing = true;
  if (leaving) {
    leaving = false;
    voice.classList.remove("outro");
  }
  voice.hidden = false;
  voice.className = introducing ? `${v.kind} intro` : v.kind;
  voiceStop.hidden = v.kind !== "screen";
  const mic = v.mic ? svg(MIC) : svg(MIC + SLASH, 13, true);
  let text = v.where;
  let icons = mic;
  if (v.kind === "screen") {
    icons = svg(SCREEN);
    text = `Sharing your screen · ${v.channel}`;
  } else if (v.kind === "camera") {
    icons = svg(CAMERA) + mic;
  } else if (v.kind === "joining") {
    text = `Joining ${v.channel}…`;
  } else if (v.kind === "error") {
    icons = svg(ALERT);
    text = "Couldn't join voice";
  }
  voiceIcons.innerHTML = icons;
  voiceIcons.style.display = "inline-flex";
  voiceIcons.style.gap = "4px";
  where.textContent = text;
  voiceOpen.setAttribute("aria-label", `${text}. Show voice controls`);
  voiceOpen.title = v.where;
}
