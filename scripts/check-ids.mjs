import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Every id on a shell page has to be unique, because every one of them is
// reached with getElementById and that returns the first in document
// order. A section and the checkbox inside it once shared "notifications":
// the lookup handed back the <section>, render set .checked on it, which
// is nothing, and the change handler read .checked back as undefined — so
// the setting never showed and never saved. Nothing else catches this.
// Biome does not read the HTML, and TypeScript believes the cast to
// HTMLInputElement whatever the element turns out to be.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = join(root, "src", "renderer");

// id="..." or id='...', which is every form these pages use.
const ID = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

let bad = 0;

for (const dir of readdirSync(pages, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const file = join(pages, dir.name, "index.html");
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch {
    continue; // a directory without a page of its own
  }
  const seen = new Map();
  for (const [, quoted, single] of html.matchAll(ID)) {
    const id = quoted ?? single;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const twice = [...seen].filter(([, n]) => n > 1);
  if (twice.length === 0) continue;
  bad += twice.length;
  for (const [id, n] of twice) {
    console.error(
      `${relative(root, file)}: id="${id}" used ${n} times — getElementById can only ever return the first`,
    );
  }
}

if (bad > 0) {
  console.error(`\ncheck-ids: ${bad} duplicate id(s). Give each one its own.`);
  process.exit(1);
}

console.log("ok  ids");
