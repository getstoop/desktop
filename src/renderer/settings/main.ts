import type { SettingsView } from "../../shared/bridge";

const launchAtLogin = document.getElementById(
  "launchAtLogin",
) as HTMLInputElement;
const keepRunning = document.getElementById("keepRunning") as HTMLInputElement;
const serverList = document.getElementById("serverList") as HTMLDivElement;
const version = document.getElementById("version") as HTMLSpanElement;

function render(view: SettingsView) {
  launchAtLogin.checked = view.launchAtLogin;
  keepRunning.checked = view.keepRunning;
  version.textContent = view.version;
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
