import { join } from "node:path";
import {
  BrowserWindow,
  type DesktopCapturerSource,
  desktopCapturer,
  ipcMain,
  type Session,
  type Streams,
} from "electron";
import { IPC, type PickerSource } from "../shared/bridge";

// getDisplayMedia in a page fails until the main process answers it;
// there is no built-in picker. macOS 15 and later has a system picker,
// which Electron uses when asked. Everywhere else the shell opens a
// picker window of its own: screens and windows with thumbnails, and
// system audio where the platform can capture it (Windows).
//
// On a Wayland desktop the portal has already asked the person what to
// share by the time getSources answers, so its single answer is used
// as is rather than asking twice.

const shellPreload = join(__dirname, "../preload/shell.js");

export function answerScreenShare(session: Session) {
  session.setDisplayMediaRequestHandler(
    (request, callback) => {
      void pick(
        request.frame
          ? BrowserWindow.fromWebContents(request.frame as never)
          : null,
      )
        .then(callback)
        .catch(() => callback({}));
    },
    { useSystemPicker: true },
  );
}

async function pick(parent: BrowserWindow | null): Promise<Streams> {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 200 },
    fetchWindowIcons: true,
  });
  if (sources.length === 0) return {};
  const wayland = process.platform === "linux" && !!process.env.WAYLAND_DISPLAY;
  if (wayland || sources.length === 1) return streams(sources[0], false);
  const choice = await ask(parent, sources);
  if (!choice) return {};
  const source = sources.find((s) => s.id === choice.id);
  return source ? streams(source, choice.audio) : {};
}

function streams(video: DesktopCapturerSource, audio: boolean): Streams {
  return {
    video,
    // System audio with a screen is only capturable on Windows.
    audio: audio && process.platform === "win32" ? "loopback" : undefined,
  };
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
      backgroundColor: "#24262b",
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
        audio: process.platform === "win32",
      });
      win.show();
    });
    const dev = process.env.ELECTRON_RENDERER_URL;
    if (dev) void win.loadURL(`${dev}/picker/index.html`);
    else void win.loadFile(join(__dirname, "../renderer/picker/index.html"));
  });
}
