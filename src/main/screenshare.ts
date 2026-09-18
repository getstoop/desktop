import { join } from "node:path";
import {
  BrowserWindow,
  type DesktopCapturerSource,
  desktopCapturer,
  dialog,
  ipcMain,
  type Session,
  type Streams,
  shell,
  systemPreferences,
} from "electron";
import { IPC, type Palette, type PickerSource } from "../shared/bridge";

// getDisplayMedia in a page fails until the main process answers it;
// there is no built-in picker, so the shell opens one of its own:
// screens and windows with thumbnails, and system audio where the
// platform can capture it. Every platform gets the same picker.
//
// macOS 15 and later has a system picker, and Electron will use it when
// asked, but it hands back no audio track (electron/electron#44685), so
// it is never asked. Our own picker gets one, at the price of a Screen
// Recording grant: desktopCapturer lists nothing without it.
//
// On a Wayland desktop the portal has already asked the person what to
// share by the time getSources answers, so its single answer is used
// as is rather than asking twice.

const shellPreload = join(__dirname, "../preload/shell.js");

const screenRecordingSettings =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

// Whether macOS has refused us the screen. An undecided Mac is not a
// refusal: asking desktopCapturer is what raises the prompt, so that
// first share fails, the person grants, and the next one works. macOS
// decides this per responsible process, so a dev run is charged to the
// terminal.
function screenRefused(): boolean {
  if (process.platform !== "darwin") return false;
  const status = systemPreferences.getMediaAccessStatus("screen");
  return status === "denied" || status === "restricted";
}

// A refused Mac would otherwise fail the share without a word; say why
// and offer the way to the switch.
async function explainRefusal(parent: BrowserWindow | null) {
  const options: Electron.MessageBoxOptions = {
    type: "info",
    message: "Stoop needs permission to share your screen",
    detail:
      "Turn on Stoop under Screen & System Audio Recording in System Settings, then share again.",
    buttons: ["Open System Settings", "Not Now"],
    defaultId: 0,
    cancelId: 1,
  };
  const { response } = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);
  if (response === 0) void shell.openExternal(screenRecordingSettings);
}

// Electron reads null as "the person said no". An empty object instead
// throws "Video was requested, but no video stream was provided".
function deny(callback: (streams: Streams) => void) {
  (callback as (streams: Streams | null) => void)(null);
}

// parent is the window the picker should sit over.
export function answerScreenShare(
  session: Session,
  parent: () => BrowserWindow | null,
  palette: () => Palette,
) {
  session.setDisplayMediaRequestHandler((_request, callback) => {
    if (screenRefused()) {
      deny(callback);
      void explainRefusal(parent());
      return;
    }
    void pick(parent(), palette())
      .then((chosen) => (chosen ? callback(chosen) : deny(callback)))
      .catch(() => deny(callback));
  });
}

async function pick(
  parent: BrowserWindow | null,
  palette: Palette,
): Promise<Streams | null> {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 200 },
    fetchWindowIcons: true,
  });
  if (sources.length === 0) return null;
  const wayland = process.platform === "linux" && !!process.env.WAYLAND_DISPLAY;
  if (wayland) return streams(sources[0], false);
  const choice = await ask(parent, sources, palette);
  if (!choice) return null;
  const source = sources.find((s) => s.id === choice.id);
  return source ? streams(source, choice.audio) : null;
}

// Where a screen's own audio can be captured alongside it. Not Linux:
// Electron cannot leave our own output out of the capture there, so a
// share inside a call would re-publish the call.
const systemAudio =
  process.platform === "win32" || process.platform === "darwin";

function streams(video: DesktopCapturerSource, audio: boolean): Streams {
  return { video, audio: audio && systemAudio ? "loopback" : undefined };
}

interface Choice {
  id: string;
  audio: boolean;
}

// Opens the picker window and resolves with what was chosen, or null
// when it was cancelled or closed.
function ask(
  parent: BrowserWindow | null,
  sources: DesktopCapturerSource[],
  palette: Palette,
): Promise<Choice | null> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 720,
      height: 600,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: "Share your screen",
      parent: parent ?? undefined,
      modal: !!parent,
      show: false,
      backgroundColor: palette.panel,
      webPreferences: {
        preload: shellPreload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.setMenuBarVisibility(false);
    let settled = false;
    const done = (choice: Choice | null) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener(IPC.pickerChoice, onChoice);
      resolve(choice);
      if (!win.isDestroyed()) win.close();
    };
    const onChoice = (event: Electron.IpcMainEvent, choice: Choice | null) => {
      if (event.sender.id === win.webContents.id) done(choice);
    };
    ipcMain.on(IPC.pickerChoice, onChoice);
    win.on("closed", () => done(null));
    win.webContents.once("did-finish-load", () => {
      const list: PickerSource[] = sources.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.id.startsWith("screen:") ? "screen" : "window",
        thumbnail: s.thumbnail.isEmpty() ? "" : s.thumbnail.toDataURL(),
        icon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : "",
      }));
      win.webContents.send(IPC.pickerSources, {
        sources: list,
        audio: systemAudio,
      });
      win.show();
    });
    const dev = process.env.ELECTRON_RENDERER_URL;
    if (dev) void win.loadURL(`${dev}/picker/index.html`);
    else void win.loadFile(join(__dirname, "../renderer/picker/index.html"));
  });
}
