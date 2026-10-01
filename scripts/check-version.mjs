import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A release has to be the version the app carries. The installers are
// named from package.json, the app reports it (App settings → About,
// window.stoop.version, the user agent), and electron-builder attaches
// what it builds to the release called v<that version> — so a release
// candidate that says anything else gets installers that disagree with
// the release they sit under, or land on a second release nobody asked
// for.
//
// The notes have to name it too. docs/release-notes.md is the release's
// notes, and each release candidate rewrites it; one that moved the
// version and left the notes alone would publish the last release's
// notes over this one.
//
//   node scripts/check-version.mjs          the version is well formed
//                                           and the notes name it
//   node scripts/check-version.mjs 0.2.0    and it is the release being
//                                           built

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

const VERSION = /^\d+\.\d+\.\d+$/;

if (!VERSION.test(version)) {
  console.error(
    `check-version: package.json says "${version}"; a version is X.Y.Z`,
  );
  process.exit(1);
}

// The first line is the version alone, as a release candidate writes
// it, or a sentence that starts with it.
const heading = `Stoop Desktop ${version}`;
const notes = readFileSync(join(root, "docs", "release-notes.md"), "utf8");
const opening = notes.split("\n", 1)[0];
if (opening !== heading && !opening.startsWith(`${heading} `)) {
  console.error(
    `check-version: docs/release-notes.md has to open with "${heading}"; it opens with "${opening}"`,
  );
  process.exit(1);
}

const release = process.argv[2];
if (release !== undefined && release !== version) {
  console.error(
    `check-version: the release being built is ${release} and package.json says ${version}`,
  );
  process.exit(1);
}

console.log(`check-version: ${version}`);
