import { desktopCapturer, type Session } from "electron";

// getDisplayMedia in a page fails until the main process answers it;
// there is no built-in picker. macOS 15 and later has a system picker,
// which Electron uses when asked. Elsewhere this hands over the primary
// screen until the shell has a picker window of its own (Desktop 7).
export function answerScreenShare(session: Session) {
  session.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen"] })
        .then((sources) => {
          const screen = sources[0];
          if (!screen) return callback({});
          callback({
            video: screen,
            // System audio with a screen is only capturable on Windows.
            audio: process.platform === "win32" ? "loopback" : undefined,
          });
        })
        .catch(() => callback({}));
    },
    { useSystemPicker: true },
  );
}
