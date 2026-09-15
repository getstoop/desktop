import type { Palette, SettingsView } from "../../shared/bridge";
import {
  cssTokens,
  matchesFilter,
  PALETTES,
  resolveTheme,
  THEME_FILTERS,
  THEMES,
  type ThemeFilter,
  type ThemeId,
  type ThemePreference,
} from "../../shared/themes";
import { followTheme } from "../theme";

followTheme();

const launchAtLogin = document.getElementById(
  "launchAtLogin",
) as HTMLInputElement;
const keepRunning = document.getElementById("keepRunning") as HTMLInputElement;
const serverList = document.getElementById("serverList") as HTMLDivElement;
const version = document.getElementById("version") as HTMLSpanElement;
const themeInUse = document.getElementById(
  "themeInUse",
) as HTMLParagraphElement;
const themeFilters = document.getElementById(
  "themeFilters",
) as HTMLFieldSetElement;
const themeCards = document.getElementById("themeCards") as HTMLDivElement;
const followSystem = document.getElementById(
  "followSystem",
) as HTMLInputElement;
const systemHint = document.getElementById("systemHint") as HTMLSpanElement;
const dndSwitch = document.getElementById("dndSwitch") as HTMLInputElement;
// Not "notifications": the section around it already owns that id, and
// getElementById would hand back the section, whose .checked is nothing.
const desktopNotifications = document.getElementById(
  "desktopNotifications",
) as HTMLInputElement;

// One section at a time, chosen from the column, as the web app's
// settings frame does.
const links = document.querySelectorAll<HTMLButtonElement>(".nav-link");
const sections = document.querySelectorAll<HTMLElement>(".section");
for (const link of links) {
  link.addEventListener("click", () => {
    for (const l of links) l.classList.toggle("active", l === link);
    for (const s of sections) s.hidden = s.id !== link.dataset.section;
  });
}
(document.getElementById("back") as HTMLButtonElement).addEventListener(
  "click",
  () => window.shell.showPage("back"),
);

// The theme preference as main last confirmed it; a click sends a
// changed copy up and paints what comes back.
let pref: ThemePreference | null = null;

function render(view: SettingsView) {
  const backLabel = document.getElementById("backLabel") as HTMLSpanElement;
  backLabel.textContent = view.front ? `Back to ${view.front}` : "Back";
  launchAtLogin.checked = view.launchAtLogin;
  keepRunning.checked = view.keepRunning;
  desktopNotifications.checked = view.notifications;
  dndSwitch.checked = view.dnd;
  version.textContent = view.version;
  pref = view.theme;
  renderThemes(view.theme);
  serverList.replaceChildren();
  if (view.servers.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No servers yet.";
    serverList.append(p);
  }
  for (const server of view.servers) {
    const row = document.createElement("div");
    row.className = "server-row";
    const tile = document.createElement("span");
    tile.className = "server-tile";
    tile.textContent = (server.name || "?").slice(0, 1).toUpperCase();
    const text = document.createElement("div");
    text.className = "server-text";
    const name = document.createElement("span");
    name.className = "server-name";
    name.textContent = server.name;
    const host = document.createElement("span");
    host.className = "server-host";
    host.textContent = server.version
      ? `${hostOf(server.url)} · Stoop ${server.version}`
      : hostOf(server.url);
    text.append(name, host);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chip danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      if (
        confirm(
          `Remove ${server.name}? You can add it again later; your account on it is untouched.`,
        )
      ) {
        window.shell.removeServer(server.id);
        void load();
      }
    });
    row.append(tile, text, remove);
    serverList.append(row);
  }
}

// ---- notifications ----

dndSwitch.addEventListener("change", async () => {
  render(await window.shell.setSettings({ dnd: dndSwitch.checked }));
});
desktopNotifications.addEventListener("change", async () => {
  render(
    await window.shell.setSettings({
      notifications: desktopNotifications.checked,
    }),
  );
});
(
  document.getElementById("testNotification") as HTMLButtonElement
).addEventListener("click", () => window.shell.testNotification());

// ---- appearance ----

// The web app's picker, redrawn here: one card per theme, painted in
// that theme's own tokens, the active one ringed. In system mode the
// dark and light halves of the pair show dashed, and a click changes
// the half the clicked theme belongs to.
//
// Twenty-five themes is a wall, so the grid shows one filter at a time:
// the tiers (light, dim, dark), the "accessible" tag, or all. It opens
// on the tier of the theme in use, so the highlighted card is on screen;
// the filter itself is not remembered.
let filter: ThemeFilter | null = null;

function renderThemes(p: ThemePreference) {
  const active = resolveTheme(p, systemDark());
  const current = THEMES.find((t) => t.id === active);
  filter ??= current?.tier ?? "dark";
  followSystem.checked = p.mode === "system";
  systemHint.textContent =
    p.mode === "system"
      ? ` — ${nameOf(p.dark)} when dark, ${nameOf(p.light)} when light. Click a card to change either.`
      : "";
  themeInUse.textContent = `In use: ${current?.name ?? active} (${current?.tier ?? "dark"}).`;
  for (const el of themeFilters.querySelectorAll("button")) el.remove();
  for (const f of THEME_FILTERS) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    if (f.id === filter) chip.classList.add("active");
    chip.setAttribute("aria-pressed", String(f.id === filter));
    chip.textContent = f.label;
    chip.addEventListener("click", () => {
      filter = f.id;
      if (pref) renderThemes(pref);
    });
    themeFilters.append(chip);
  }
  themeCards.replaceChildren();
  for (const t of THEMES.filter((t) => matchesFilter(t, filter ?? "all"))) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card";
    if (t.id === active) card.classList.add("active");
    if (p.mode === "system" && (p.dark === t.id || p.light === t.id))
      card.classList.add("paired");
    card.setAttribute("aria-pressed", String(t.id === active));
    wear(card, PALETTES[t.id]);
    card.innerHTML = MOCK;
    const name = document.createElement("span");
    name.className = "theme-card-name";
    name.textContent = t.name;
    const kind = document.createElement("span");
    kind.className = "theme-card-kind";
    kind.textContent = t.tier;
    name.append(kind);
    const blurb = document.createElement("span");
    blurb.className = "theme-card-blurb";
    blurb.textContent = t.blurb;
    card.append(name, blurb);
    if (filter === "accessible" && t.why) {
      const why = document.createElement("span");
      why.className = "theme-card-why";
      why.textContent = t.why;
      card.append(why);
    }
    card.addEventListener("click", () => choose(t.id));
    themeCards.append(card);
  }
}

const MOCK = `<span class="theme-mock" aria-hidden="true">
  <span class="theme-mock-rail"><span class="theme-mock-pill on"></span><span class="theme-mock-pill"></span></span>
  <span class="theme-mock-side"><span class="theme-mock-line active"></span><span class="theme-mock-line"></span><span class="theme-mock-line"></span></span>
  <span class="theme-mock-main">
    <span class="theme-mock-msg"><span class="theme-mock-av"></span><span class="theme-mock-text"><span class="theme-mock-who"></span><span class="theme-mock-body"></span></span></span>
    <span class="theme-mock-msg"><span class="theme-mock-av"></span><span class="theme-mock-text"><span class="theme-mock-who"></span><span class="theme-mock-body short"></span></span></span>
    <span class="theme-mock-composer"></span>
  </span>
</span>`;

// Sets a theme's tokens on one element, so its subtree wears that theme
// whatever the page around it wears.
function wear(el: HTMLElement, palette: Palette) {
  for (const [name, value] of Object.entries(cssTokens(palette)))
    el.style.setProperty(name, value);
}

const nameOf = (id: ThemeId) => THEMES.find((t) => t.id === id)?.name ?? id;

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

async function setTheme(theme: ThemePreference) {
  render(await window.shell.setSettings({ theme }));
}

function choose(id: ThemeId) {
  if (!pref) return;
  const kind = THEMES.find((t) => t.id === id)?.kind ?? "dark";
  void setTheme(
    pref.mode === "system"
      ? { ...pref, [kind]: id }
      : { ...pref, theme: id, [kind]: id },
  );
}

followSystem.addEventListener("change", () => {
  if (!pref) return;
  void setTheme({ ...pref, mode: followSystem.checked ? "system" : "theme" });
});

// The OS flipping light and dark moves the ring in system mode; main
// repaints the page itself.
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (pref) renderThemes(pref);
});

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function load() {
  render(await window.shell.getSettings());
}

launchAtLogin.addEventListener("change", async () => {
  render(
    await window.shell.setSettings({ launchAtLogin: launchAtLogin.checked }),
  );
});
keepRunning.addEventListener("change", async () => {
  render(await window.shell.setSettings({ keepRunning: keepRunning.checked }));
});
(document.getElementById("addServer") as HTMLButtonElement).addEventListener(
  "click",
  () => window.shell.showPage("add"),
);
(document.getElementById("releases") as HTMLButtonElement).addEventListener(
  "click",
  () => window.shell.updateApp(),
);

void load();
