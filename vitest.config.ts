import { defineConfig } from "vitest/config";

// Unit tests sit beside the code they cover, as *.test.ts. They run in
// Node: the modules under test either import no Electron at all or use
// it only inside functions, so a test mocks the "electron" module and
// nothing has to launch.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
