import type { ServerRow, SwitcherView } from "../../shared/bridge";
import { followTheme } from "../theme";

followTheme();

const panel = document.getElementById("panel") as HTMLDivElement;
const rows = document.getElementById("rows") as HTMLDivElement;
const backdrop = document.getElementById("backdrop") as HTMLDivElement;
const add = document.getElementById("add") as HTMLButtonElement;
const settings = document.getElementById("settings") as HTMLButtonElement;

const WARN =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>';

const monogram = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

// A repaint keeps the keyboard where it was: on the same server if it is
// still listed, or on the action button it was on. The first paint, and
// a server that has gone, land on the one in front.
function draw(view: SwitcherView) {
  const focused = document.activeElement;
  const inPanel = focused instanceof HTMLElement && panel.contains(focused);
  const wasOn = inPanel ? focused.dataset.id : undefined;
  panel.style.left = `${view.left}px`;
  rows.replaceChildren();
  for (const server of view.rows) rows.append(row(server));
  if (inPanel && !wasOn) return;
  const again = wasOn ? rowFor(wasOn) : null;
  (
    again ??
    rows.querySelector<HTMLButtonElement>(".current") ??
    focusables()[0]
  )?.focus();
}

const rowFor = (id: string) =>
  rows.querySelector<HTMLButtonElement>(`[data-id="${CSS.escape(id)}"]`);

function row(server: ServerRow): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "switcher-row";
  button.setAttribute("role", "menuitem");
  button.dataset.id = server.id;
  if (server.current) button.classList.add("current");
  if (server.state !== "ok") button.classList.add("gated");

  const bar = document.createElement("span");
  bar.className = "switcher-bar";

  const tile = document.createElement("span");
  tile.className = "switcher-tile";
  if (server.state === "ok") {
    tile.style.background = server.tile;
    tile.style.color = server.tileText;
  }
  tile.textContent = monogram(server.name);

  const text = document.createElement("span");
  text.className = "switcher-text";
  const name = document.createElement("span");
  name.className = "switcher-name";
  name.textContent = server.name;
  const host = document.createElement("span");
  host.className = "switcher-host";
  host.textContent = server.host;
  text.append(name, host);

  button.append(bar, tile, text, right(server));
  button.addEventListener("click", () => window.shell.chooseServer(server.id));
  return button;
}

// One thing at a time on the right: what is waiting, what is wrong, or
// the shortcut that gets here without the panel.
function right(server: ServerRow): HTMLElement {
  if (server.state !== "ok") {
    const warn = document.createElement("span");
    warn.className = "switcher-warn";
    warn.innerHTML = WARN;
    warn.title =
      server.state === "too-old"
        ? "This server needs updating"
        : server.state === "not-stoop"
          ? "Not a Stoop server"
          : "Cannot be reached";
    return warn;
  }
  if (server.badge > 0) {
    const badge = document.createElement("span");
    badge.className = "switcher-badge";
    badge.textContent = server.badge > 99 ? "99+" : String(server.badge);
    return badge;
  }
  const hint = document.createElement("span");
  hint.className = "switcher-hint";
  hint.textContent = server.accelerator;
  return hint;
}

const focusables = () =>
  [...panel.querySelectorAll<HTMLButtonElement>("button")].filter(
    (b) => b.offsetParent !== null,
  );

function move(step: number) {
  const items = focusables();
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = at === -1 ? 0 : (at + step + items.length) % items.length;
  items[next].focus();
}

backdrop.addEventListener("click", () => window.shell.closeSwitcher());
add.addEventListener("click", () => window.shell.showPage("add"));
settings.addEventListener("click", () => window.shell.showPage("settings"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") window.shell.closeSwitcher();
  else if (event.key === "ArrowDown") {
    event.preventDefault();
    move(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    move(-1);
  }
});

window.shell.onSwitcherRows(draw);
