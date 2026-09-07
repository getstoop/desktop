import { join } from "node:path";
import { app, nativeImage } from "electron";

// The steps mark for the menu bar / tray: a template image pair on
// disk (trayTemplate.png and its @2x), loaded by path so macOS picks
// the representation and the size itself, the way other apps' icons
// are drawn. In development the files sit in resources/tray; packaged,
// electron-builder copies them beside the app (extraResources).
export function trayIcon() {
  const dir = app.isPackaged
    ? process.resourcesPath
    : join(app.getAppPath(), "resources", "tray");
  const image = nativeImage.createFromPath(join(dir, "trayTemplate.png"));
  image.setTemplateImage(true);
  return image;
}
