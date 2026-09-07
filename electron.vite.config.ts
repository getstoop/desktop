import { resolve } from "node:path";
import { defineConfig } from "electron-vite";

export default defineConfig({
  main: {},
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
    build: {
      rollupOptions: {
        input: {
          // The app's own pages. Each is a view the main process places.
          add: resolve(__dirname, "src/renderer/add/index.html"),
          chrome: resolve(__dirname, "src/renderer/chrome/index.html"),
          gate: resolve(__dirname, "src/renderer/gate/index.html"),
          settings: resolve(__dirname, "src/renderer/settings/index.html"),
          picker: resolve(__dirname, "src/renderer/picker/index.html"),
        },
      },
    },
  },
});
