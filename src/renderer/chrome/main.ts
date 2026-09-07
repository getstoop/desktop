const server = document.getElementById("server") as HTMLButtonElement;
const name = document.getElementById("name") as HTMLSpanElement;
const dot = document.getElementById("dot") as HTMLSpanElement;
const controls = document.getElementById("controls") as HTMLDivElement;
const update = document.getElementById("update") as HTMLButtonElement;
update.addEventListener("click", () => window.shell.updateApp());

server.addEventListener("click", () => window.shell.openMenu());
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
  const mac = state.platform === "darwin";
  document.body.classList.toggle("no-lights", !mac);
  controls.hidden = mac;
});

export {};
