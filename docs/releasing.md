# Releasing Stoop for the desktop

A release is four steps on GitHub. Nobody tags by hand.

1. **Cut the release candidate.** Actions → **Cut release candidate** →
   Run workflow, on `main`, with the version (`0.3.0`). It opens the pull
   request "Release 0.3.0".
2. **Review and merge it.** Rewrite `docs/release-notes.md` in the pull
   request first, keeping its first line: what changed for the people
   using the app, a minimum server version that moved, anything that
   behaves differently, known issues.
3. **Wait for Build release.** The merge starts it. It leaves a draft
   release with an installer for every platform: a universal `.dmg` and
   `.zip`, a Windows installer, an AppImage and a `.deb`, with
   `latest-mac.yml`, `latest.yml` and `latest-linux.yml` beside them,
   which is what an installed app reads ([Updates](#updates)).
4. **Publish the draft** from the Releases page. That makes the tag, and
   it is the moment every installed app sees the release: each checks
   within hours and downloads it on its own.

Before publishing, check the draft. Download each installer from it and
install it on a clean machine. Add a server, sign in, join voice. Check
that App settings → About shows the version. Install over the previous
release and check that the server list and the settings survived. Check
that the three `latest*.yml` files and the macOS `.zip` are on the
draft: without them an installed app finds nothing, and without the zip
a Mac finds the release and cannot take it. Anything wrong after
publishing becomes the next release; the tag is never moved.

To drop a release, close the pull request, or delete the draft once it
is built.

This is the server's process
([docs/releasing.md](https://github.com/getstoop/stoop/blob/main/docs/releasing.md)),
step for step. What differs is what gets built, and that nothing has to
run when the draft is published: the app's updater and the website both
read the newest published release from GitHub.

## Versions

Semantic-ish, from `v0.1.0`, and the app's own: the numbers do not
follow the server's. What ties the two together is the contract
([docs/architecture/desktop.md](https://github.com/getstoop/stoop/blob/main/docs/architecture/desktop.md)
in the server repository), not the version.

- **A minor** for a feature, a new bridge level, or a higher
  `MIN_SERVER_VERSION` (`src/main/probe.ts`).
- **A patch** for fixes that are none of those.

While the major is 0 anything may change between minors, and the release
notes say when it does.

The version lives in one place, `version` in `package.json`, and the
release candidate is what moves it. The installers are named from it and
the app reports it: App settings → About, `window.stoop.version`, and
the user agent. `scripts/check-version.mjs` fails Build release when
the release candidate's branch names any other version. It also fails,
on every push, when `docs/release-notes.md` does not open by naming the
version.

A release is cut from `main`, so it carries everything merged since the
last one. There are no release branches. Between releases `main` carries
the version of the last one, so a build from `main` reports a version it
is already past. The commit is what identifies such a build.

## What the release path does not test

The Build workflow makes the installers on every push, so packaging is
exercised all the time. What only Build release does is not: the
version check, making the draft, electron-builder attaching to it,
signing the macOS and Windows builds and notarizing the macOS one. After
changing any of them in `.github/workflows/build-release.yml`, the next
release's draft is the test: look it over before publishing, and delete
it and run the build again if it came out wrong. Signing alone can be
tried without a release: run Build release by hand on `main`, which
leaves signed installers on the run and attaches them to nothing.

The two workflows build the app the same way, in a package job each. A
change to how it is built belongs in both.

The macOS installer is signed and notarized and the Windows one is
signed, and Build release fails when the secrets for either are
missing. A verify step then asks each installer whether it took, and
that going red is what says not to publish the draft. The Linux
packages are unsigned (the README says what each system does about
that).

Cut release candidate needs one secret of its own, `RELEASE_TOKEN`: a
token that can push a branch and open a pull request here.

The tag ruleset lets only repository admins create `v*` tags and nobody
move or delete one, so it takes an admin to publish a draft.

## Updates

An installed app updates itself from the releases here
(`src/main/updates.ts`, on electron-updater). It asks GitHub for the
newest published release soon after launch and every four hours, reads
the `latest*.yml` for its platform, and downloads the new version in
the background. Nothing is forced: the title strip, the tray and App
settings → About offer a restart, and the download installs on the next
quit either way. A check sends GitHub the request and nothing else.

What that asks of a release:

- **The metadata and the zip.** electron-builder attaches
  `latest-mac.yml`, `latest.yml`, `latest-linux.yml` and the macOS zip
  with the installers; the check of the draft above looks for them. A
  release without them is one no installed app can find or take.
- **A signed macOS build.** Squirrel refuses an update into an unsigned
  app, and refuses an unsigned one. Both hold for a release; a `make
  package` build on a laptop finds the release and fails to install it,
  which About reports.
- **A public repository, or a published release.** The updater reads the
  release without credentials. It cannot see a draft.
- **A signed Windows build.** electron-builder writes the publisher's
  name from `electron-builder.windows-signing.yml` into the app, and
  the updater refuses an installer whose signature names anyone else;
  a change to the certificate's subject goes into that file with it. An
  app from 0.1.0, which came before the signing, checks the sha512 in
  `latest.yml` and no further, and takes the first signed release like
  any other.

A draft cannot test the updater, since no installed app can see one. A
change to the updater, or to how the release attaches its files, shows
only once a release is published: watch an installed app take it.
