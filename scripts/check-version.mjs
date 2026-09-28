import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A release tag has to name the version the app carries. The installers
// are named from package.json, the app reports it (App settings → About,
// window.stoop.version, the user agent), and electron-builder attaches
// what it builds to the release called v<that version> — so a tag that
// says anything else gets installers that disagree with the release they
// sit under, or land on a second release nobody asked for.
//
// The notes have to name it too. docs/release-notes.md heads the release,
// and each release PR rewrites it; one that moved the version and left
// the notes alone would publish the last release's notes over this one.
//
//   node scripts/check-version.mjs          the version is well formed
//                                           and the notes name it
//   node scripts/check-version.mjs v0.2.0   and the tag names it

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

// X.Y.Z, or X.Y.Z-rc.N for a release candidate.
const VERSION = /^\d+\.\d+\.\d+(-rc\.\d+)?$/;

if (!VERSION.test(version)) {
  console.error(
    `check-version: package.json says "${version}"; a version is X.Y.Z or X.Y.Z-rc.N`,
  );
  process.exit(1);
}

// A release candidate carries the notes of the release it is a
// candidate for, so the notes name X.Y.Z either way.
const release = version.replace(/-rc\.\d+$/, "");
const notes = readFileSync(join(root, "docs", "release-notes.md"), "utf8");
const opening = notes.split("\n", 1)[0];
if (!opening.startsWith(`Stoop Desktop ${release} `)) {
  console.error(
    `check-version: docs/release-notes.md has to open with "Stoop Desktop ${release}"; it opens with "${opening}"`,
  );
  process.exit(1);
}

const tag = process.argv[2];
if (tag !== undefined && tag !== `v${version}`) {
  console.error(
    `check-version: the tag is ${tag} and package.json says ${version}; the tag for this commit is v${version}`,
  );
  process.exit(1);
}

console.log(
  tag ? `check-version: ${tag} names ${version}` : `check-version: ${version}`,
);
