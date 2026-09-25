import { join } from "node:path";
import { app, nativeImage } from "electron";

// The mark for the menu bar / tray. On macOS a template image pair
// (trayTemplate.png and its @2x), loaded by path so the system picks the
// representation and recolours it for the bar. Windows and Linux draw the
// image as-is, so they get the coloured tile: an .ico for Windows, a PNG
// for Linux. In development the files sit in resources/tray; packaged,
// electron-builder copies them beside the app (extraResources).
export function trayIcon() {
  const dir = app.isPackaged
    ? process.resourcesPath
    : join(app.getAppPath(), "resources", "tray");
  if (process.platform === "win32") {
    return nativeImage.createFromPath(join(dir, "tray.ico"));
  }
  if (process.platform === "linux") {
    return nativeImage.createFromPath(join(dir, "tray.png"));
  }
  const image = nativeImage.createFromPath(join(dir, "trayTemplate.png"));
  image.setTemplateImage(true);
  return image;
}

// Linux shows a window's icon from BrowserWindow rather than the bundle;
// macOS and Windows ignore the option. electron-builder copies one size
// beside the app for it (electron-builder.yml).
export function windowIcon() {
  if (process.platform !== "linux") return undefined;
  return app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(app.getAppPath(), "resources", "icons", "256x256.png");
}
