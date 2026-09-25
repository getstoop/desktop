#!/usr/bin/env node
// Copies the desktop's brand files in from the server repo, where the
// masters and the pipeline live (brand/ there, docs/brand.md for the
// design). Run `make brand` in that checkout first when the mark changed.
//
//   node scripts/brand-sync.mjs [path-to-stoop/brand/dist/desktop]
//
// Defaults to a sibling checkout, ../stoop.

import { cpSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(process.argv[2] ?? join(root, "../stoop/brand/dist/desktop"));
if (!existsSync(join(from, "icon.icns"))) {
  console.error(`brand-sync: ${from} has no icon.icns; pass the server repo's brand/dist/desktop`);
  process.exit(1);
}

const files = [
  ["icon.icns", "resources/icon.icns"],
  ["icon.ico", "resources/icon.ico"],
  ["icon.png", "resources/icon.png"],
  ["icons", "resources/icons"],
  ["tray", "resources/tray"],
  ["mark.svg", "src/renderer/mark.svg"],
];
for (const [src, dst] of files) {
  cpSync(join(from, src), join(root, dst), { recursive: true });
  console.log(`${dst} <- ${join(from, src)}`);
}
