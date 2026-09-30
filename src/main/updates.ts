import { readFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { autoUpdater } from "electron-updater";
import type { UpdateState } from "../shared/bridge";

// The app keeping itself current: electron-updater against the
// repository's releases. electron-builder attaches a latest*.yml to each
// release beside the installers, naming the version and its files, and
// the app reads the newest published release's. A draft is invisible, so
// publishing the draft (docs/releasing.md) is the moment an installed app
// sees a release.
//
// A check runs shortly after launch and every few hours after that. What
// it finds is downloaded in the background and installs when the app
// next quits; nothing is forced. The strip, the tray and App settings →
// About offer a restart, and the app runs on until it is taken. A check
// that fails — offline, as a rule — is kept quiet: About says so when
// looked at, and nothing else does.
//
// Each package has its own way in, all electron-updater's: Squirrel on
// macOS, which is why a release carries a zip beside the dmg and why a
// build has to be signed for it to work; the NSIS installer run silent on
// Windows; the AppImage replaced in place; the .deb installed through
// pkexec, which asks for the password. A build run from a checkout
// updates nothing.

const FIRST_CHECK_MS = 15 * 1000;
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;

export class Updates {
  state: UpdateState;
  // Installed from the .deb, so an install asks for the password.
  readonly deb: boolean;
  private listeners = new Set<() => void>();

  constructor() {
    this.deb = packageType() === "deb";
    if (!app.isPackaged) {
      this.state = { kind: "off" };
      return;
    }
    this.state = { kind: "idle", checkedAt: null };
    autoUpdater.logger = null;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("checking-for-update", () => this.set({ kind: "checking" }));
    autoUpdater.on("update-not-available", () =>
      this.set({ kind: "idle", checkedAt: Date.now() }),
    );
    autoUpdater.on("update-available", (info) =>
      this.set({ kind: "downloading", version: info.version, percent: 0 }),
    );
    autoUpdater.on("download-progress", (progress) => {
      if (this.state.kind === "downloading")
        this.set({ ...this.state, percent: Math.floor(progress.percent) });
    });
    autoUpdater.on("update-downloaded", (info) =>
      this.set({ kind: "ready", version: info.version }),
    );
    autoUpdater.on("error", (err) =>
      this.set({ kind: "error", detail: describe(err) }),
    );
  }

  // The schedule: once soon after launch, so the window is up first, and
  // every few hours from then on.
  start() {
    if (this.state.kind === "off") return;
    setTimeout(() => void this.check(), FIRST_CHECK_MS);
    setInterval(() => void this.check(), CHECK_EVERY_MS);
  }

  // One check, unless one is already under way or there is nothing left
  // to learn: a download in progress, or one waiting on a restart.
  async check() {
    const kind = this.state.kind;
    if (kind !== "idle" && kind !== "error") return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      // Reported through the error event as well; this catches the case
      // where it was not.
      if (this.current().kind === "checking")
        this.set({ kind: "error", detail: describe(err) });
    }
  }

  // The state as it is now. Read this way after an await: TypeScript
  // keeps the narrowing from the check above across it.
  private current(): UpdateState {
    return this.state;
  }

  // Quits into the install; the app comes back as the new version.
  install() {
    if (this.state.kind === "ready") autoUpdater.quitAndInstall();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(state: UpdateState) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

// What electron-builder wrote beside the app for a Linux package ("deb"),
// and nothing for the others.
function packageType(): string {
  try {
    return readFileSync(join(process.resourcesPath, "package-type"), "utf8")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

// One line for About. electron-updater's messages run long and carry
// the request that failed; the first line says enough.
export function describe(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const line = message.split("\n", 1)[0].trim();
  if (/ERR_INTERNET_DISCONNECTED|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/.test(line))
    return "No connection to github.com.";
  return line || "Something went wrong.";
}
