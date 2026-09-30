import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  // What package.json lists under dependencies (electron-updater) is
  // required from node_modules at run time, which electron-builder ships,
  // rather than bundled in here.
  main: { plugins: [externalizeDepsPlugin()] },
  preload: {
    build: {
      rollupOptions: {
        input: {
          // window.stoop, injected into every server page.
          bridge: resolve(__dirname, "src/preload/bridge.ts"),
          // window.shell, for the app's own pages only.
          shell: resolve(__dirname, "src/preload/shell.ts"),
        },
      },
    },
  },
  renderer: {
    // Pinned, so it never lands on the server repo's Vite port (5173) or
    // drifts off this one; a collision fails here instead.
    server: { port: 5180, strictPort: true },
    build: {
      rollupOptions: {
        input: {
          // The app's own pages. Each is a view the main process places.
          add: resolve(__dirname, "src/renderer/add/index.html"),
          chrome: resolve(__dirname, "src/renderer/chrome/index.html"),
          gate: resolve(__dirname, "src/renderer/gate/index.html"),
          settings: resolve(__dirname, "src/renderer/settings/index.html"),
          picker: resolve(__dirname, "src/renderer/picker/index.html"),
          switcher: resolve(__dirname, "src/renderer/switcher/index.html"),
          voice: resolve(__dirname, "src/renderer/voice/index.html"),
        },
      },
    },
  },
});
