import type { PickerSource } from "../../shared/bridge";
import { followTheme } from "../theme";

followTheme();

const grid = document.getElementById("grid") as HTMLDivElement;
const share = document.getElementById("share") as HTMLButtonElement;
const cancel = document.getElementById("cancel") as HTMLButtonElement;
const audioRow = document.getElementById("audioRow") as HTMLLabelElement;
const audio = document.getElementById("audio") as HTMLInputElement;
const tabScreens = document.getElementById("tabScreens") as HTMLButtonElement;
const tabWindows = document.getElementById("tabWindows") as HTMLButtonElement;

let sources: PickerSource[] = [];
let kind: "screen" | "window" = "screen";
let selected: PickerSource | null = null;

function render() {
  grid.replaceChildren();
  const shown = sources.filter((s) => s.kind === kind);
  if (shown.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent =
      kind === "screen" ? "No screens to share." : "No windows to share.";
    grid.append(p);
  }
  for (const source of shown) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "source";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(selected?.id === source.id));
    if (selected?.id === source.id) button.classList.add("selected");
    const thumb = document.createElement("img");
    thumb.className = "thumb";
    thumb.alt = "";
    if (source.thumbnail) thumb.src = source.thumbnail;
    const label = document.createElement("div");
    label.className = "label";
    if (source.icon) {
      const icon = document.createElement("img");
      icon.src = source.icon;
      icon.alt = "";
      label.append(icon);
    }
    const name = document.createElement("span");
    name.textContent = source.name;
    label.append(name);
    button.append(thumb, label);
    button.addEventListener("click", () => select(source));
    button.addEventListener("dblclick", () => {
      select(source);
      confirm();
    });
    grid.append(button);
  }
}

function select(source: PickerSource) {
  selected = source;
  share.disabled = false;
  share.textContent = `Share ${source.name.length > 28 ? `${source.name.slice(0, 28)}…` : source.name}`;
  render();
}

function confirm() {
  if (!selected) return;
  window.shell.pickerChoose({
    id: selected.id,
    audio: !audioRow.hidden && audio.checked,
  });
}

function showKind(next: "screen" | "window") {
  kind = next;
  tabScreens.classList.toggle("active", kind === "screen");
  tabWindows.classList.toggle("active", kind === "window");
  tabScreens.setAttribute("aria-selected", String(kind === "screen"));
  tabWindows.setAttribute("aria-selected", String(kind === "window"));
  render();
}

tabScreens.addEventListener("click", () => showKind("screen"));
tabWindows.addEventListener("click", () => showKind("window"));
share.addEventListener("click", confirm);
cancel.addEventListener("click", () => window.shell.pickerChoose(null));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") window.shell.pickerChoose(null);
  if (event.key === "Enter" && selected) confirm();
});

window.shell.onPickerSources((payload) => {
  sources = payload.sources;
  audioRow.hidden = !payload.audio;
  const first = sources.find((s) => s.kind === "screen") ?? sources[0];
  if (first) select(first);
  showKind(first?.kind ?? "screen");
});
