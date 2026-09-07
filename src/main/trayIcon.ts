import { nativeImage } from "electron";

// The steps mark as a monochrome template image, inlined so packaging
// needs no extra files. The menu bar fits a status image into a 16 pt
// box whatever its size, so the mark is drawn to fill exactly that, on
// whole pixels, at 1x and 2x. macOS recolours a template image for the
// menu bar; elsewhere it is drawn as is.
const PNG_1X =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAL0lEQVR42mNgGAV0AfVYMEngPxZMEMgDsT0Uk2VAPQ6NtDfgP5GYdgbUE4mHEwAA6XA04Vn+2EgAAAAASUVORK5CYII=";
const PNG_2X =
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAANElEQVR42u3OwQkAIAwAsW7u6HUBH4JFtCRw/4sAoIHczECPgbHo6kAeZOC/gSzOgAHgTRNk49OqJg6zrAAAAABJRU5ErkJggg==";

export function trayIcon() {
  const image = nativeImage.createFromDataURL(
    `data:image/png;base64,${PNG_1X}`,
  );
  image.addRepresentation({
    scaleFactor: 2,
    dataURL: `data:image/png;base64,${PNG_2X}`,
  });
  image.setTemplateImage(true);
  return image;
}
