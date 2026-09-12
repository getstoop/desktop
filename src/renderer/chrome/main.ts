const server = document.getElementById("server") as HTMLButtonElement;
const name = document.getElementById("name") as HTMLSpanElement;
const dot = document.getElementById("dot") as HTMLSpanElement;
const controls = document.getElementById("controls") as HTMLDivElement;
const update = document.getElementById("update") as HTMLButtonElement;
const gear = document.getElementById("gear") as HTMLButtonElement;
update.addEventListener("click", () => window.shell.updateApp());

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
});

export {};
