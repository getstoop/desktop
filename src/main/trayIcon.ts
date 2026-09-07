import { nativeImage } from "electron";

// The steps mark as a monochrome template image, 22 px edge to edge with a 2x
// representation, inlined so packaging needs no extra files. macOS
// recolours a template image for the menu bar; elsewhere it is drawn
// as is.
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
