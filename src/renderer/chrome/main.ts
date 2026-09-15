import type { ChromeState } from "../../shared/bridge";

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

window.shell.onChromeState((state) => {
  document.body.style.background = state.color;
  document.body.style.color = state.symbol;
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

// The same stroke icons as the web app's VoiceIcons, at the strip's size.
const svg = (paths: string, off = false) =>
  `<svg class="${off ? "off" : ""}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const MIC =
  '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>';
const SLASH = '<path d="M4 4l16 16"/>';
const CAMERA =
  '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3"/>';
const SCREEN =
  '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>';
const ALERT = '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>';

function drawVoice(v: ChromeState["voice"]) {
  voice.hidden = !v;
  if (!v) return;
  voice.className = v.kind;
  voiceStop.hidden = v.kind !== "screen";
  const mic = v.mic ? svg(MIC) : svg(MIC + SLASH, true);
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
