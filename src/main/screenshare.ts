import { join } from "node:path";
import {
  BrowserWindow,
  type DesktopCapturerSource,
  desktopCapturer,
  ipcMain,
  type Session,
  type Streams,
} from "electron";
import { IPC, type Palette, type PickerSource } from "../shared/bridge";

// getDisplayMedia in a page fails until the main process answers it;
// there is no built-in picker, so the shell opens one of its own:
// screens and windows with thumbnails, and system audio where the
// platform can capture it.
//
// macOS 15 and later has a system picker, and Electron will use it when
// asked, but it hands back no audio track (electron/electron#44685), so
// the shell asks for its own picker on every platform.
//
// On a Wayland desktop the portal has already asked the person what to
// share by the time getSources answers, so its single answer is used
// as is rather than asking twice.

const shellPreload = join(__dirname, "../preload/shell.js");

// parent is the window the picker should sit over.
export function answerScreenShare(
  session: Session,
  parent: () => BrowserWindow | null,
  palette: () => Palette,
) {
  session.setDisplayMediaRequestHandler(
    (_request, callback) => {
      void pick(parent(), palette())
        .then(callback)
        .catch(() => callback({}));
    },
    { useSystemPicker: false },
  );
}

async function pick(
  parent: BrowserWindow | null,
  palette: Palette,
): Promise<Streams> {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 200 },
    fetchWindowIcons: true,
  });
  if (sources.length === 0) return {};
  const wayland = process.platform === "linux" && !!process.env.WAYLAND_DISPLAY;
  if (wayland || sources.length === 1) return streams(sources[0], false);
  const choice = await ask(parent, sources, palette);
  if (!choice) return {};
  const source = sources.find((s) => s.id === choice.id);
  return source ? streams(source, choice.audio) : {};
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
