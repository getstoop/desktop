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
  renderer: {},
});
