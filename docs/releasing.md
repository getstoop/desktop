# Releasing Stoop for the desktop

A release is a tag: a minor on `main`, a patch on a `release/X.Y` branch
off the previous tag. Pushing it runs the Release workflow, which makes a
draft release and attaches an installer for every platform to it.
Publishing the draft is the release. Nothing else publishes anything.

This follows the server's
[docs/releasing.md](https://github.com/getstoop/stoop/blob/main/docs/releasing.md)
wherever the two can agree.

## Versions

Semantic-ish, from `v0.1.0`, and the app's own: the numbers do not
follow the server's. What ties the two together is the contract
([docs/architecture/desktop.md](https://github.com/getstoop/stoop/blob/main/docs/architecture/desktop.md)
in the server repository), not the version.

- **A minor** for a feature, a new bridge level, or a higher
  `MIN_SERVER_VERSION` (`src/main/probe.ts`).
- **A patch** for fixes that are none of those.
- **A release candidate**, `X.Y.Z-rc.N`, for a build to try before the
  release it names. Its release is marked a pre-release.

While the major is 0 anything may change between minors, and the release
notes say when it does.

The version lives in one place, `version` in `package.json`. The
installers are named from it and the app reports it: App settings →
About, `window.stoop.version`, and the user agent. The tag is
`v` and that version, and `scripts/check-version.mjs` fails the
workflow when the two disagree. It also fails, on every push, when
`docs/release-notes.md` does not open by naming the version.

Between releases `main` carries the version of the last one, so a build
from `main` reports a version it is already past. The commit is what
identifies such a build.

## A minor release, end to end

1. **Develop on `main`.** One change per PR, green CI, merge. The
   release notes start from PR titles, so title PRs for the notes.
2. **The release PR.** Set `version` in `package.json` to the version
   about to be cut. Rewrite `docs/release-notes.md`, opening with
   "Stoop Desktop" and the version: what changed for the people using
   the app, a minimum server version that moved, anything that behaves
   differently, known issues. The generated PR list is appended below
   it automatically. If the release raises `MIN_SERVER_VERSION` or the
   bridge level, the PR that did so has already landed; the release PR
   changes nothing but the version and the notes.
3. **Tag.** An annotated tag on the release PR's merge commit, pushed
   once. The tag ruleset lets only repository admins create `v*` tags
   and nobody move or delete one.

   ```sh
   git tag -a v0.2.0 -m "Stoop Desktop 0.2.0"
   git push origin v0.2.0
   ```

4. **The workflow** checks the tag against `package.json`, makes a draft
   release headed by `docs/release-notes.md` with the PRs merged since
   the last tag listed below it, and builds the installers onto it: a
   universal `.dmg` and `.zip`, a Windows installer, an AppImage and a
   `.deb`, with `latest-mac.yml`, `latest.yml` and `latest-linux.yml`
   beside them, which is what an installed app reads ([Updates](#updates)).
5. **Verify against the draft.** Download each installer from the draft
   and install it on a clean machine. Add a server, sign in, join voice.
   Check that App settings → About shows the version. Install over the
   previous release and check that the server list and the settings
   survived. Check that the three `latest*.yml` files and the macOS
   `.zip` are on the draft: without them an installed app finds nothing,
   and without the zip a Mac finds the release and cannot take it.
6. **Publish the draft.** Read the notes as they came out, then
   publish. Anything wrong after that becomes a patch release; the tag
   is never moved. Publishing is the moment every installed app sees
   the release: each checks within hours and downloads it on its own.
   It is also the moment the website learns of it: the Website workflow
   (`.github/workflows/website.yml`) runs on the publish and posts to
   getstoop.org's deploy hook, and the site rebuilds its download page
   from GitHub's published releases. Nothing else has to be done for
   the site. If that run is red the site is stale; the secret it needs
   is `CLOUDFLARE_DEPLOY_HOOK`, from the website's Cloudflare project.

## A patch release

For a fix that cannot wait for the next minor while `main` already
carries unreleased changes.

1. **Fix forward on `main` first.** Normal PR, green CI, merged.
2. **Branch from the tag, on demand.** `git switch -c release/0.2 v0.2.0`
   and push it. The main ruleset covers `release/*`: PR only, green CI,
   no force-push. Only the newest minor gets a branch; older lines are
   not patched ([SECURITY.md](../SECURITY.md)).
3. **Cherry-pick into a PR against the branch.** `git cherry-pick -x` of
   the merged fix, plus the release-PR edits: `version` set to `0.2.1`,
   a notes header describing the one fix. Green CI, merge.
4. **Tag `v0.2.1` on the branch head.** The workflow does not care which
   branch a tag is on.
5. **Verify and publish** as for a minor.
6. **Retire the branch** once the next minor ships.

A patch takes no dependency majors, and no new Electron major unless
that is the fix. A patch is the smallest change that makes the bug go
away.

## What the release path does not test

The Build workflow makes the installers on every push, so packaging is
exercised all the time. What only the Release workflow does is not: the
version check against the tag, making the draft, electron-builder
attaching to it, signing the macOS and Windows builds and notarizing
the macOS one. After
changing any of them in `.github/workflows/release.yml`, cut a release
candidate before the release that matters. Signing alone can be tried
without a tag: run the Release workflow by hand on `main`, which leaves
signed installers on the run and attaches them to nothing.

The two workflows build the app the same way, in a package job each. A
change to how it is built belongs in both.

The macOS installer is signed and notarized and the Windows one is
signed, and a tag fails when the secrets for either are missing. A
verify step then asks each installer whether it took, and that going
red is what says not to publish the draft. The Linux packages are
unsigned (the README says what each system does about that).

## Updates

An installed app updates itself from the releases here
(`src/main/updates.ts`, on electron-updater). It asks GitHub for the
newest published release soon after launch and every four hours, reads
the `latest*.yml` for its platform, and downloads the new version in
the background. Nothing is forced: the title strip, the tray and App
settings → About offer a restart, and the download installs on the next
quit either way. A release candidate reaches only apps already running
one; an app on a release never takes an rc. A check sends GitHub the
request and nothing else.

What that asks of a release:

- **The metadata and the zip.** electron-builder attaches
  `latest-mac.yml`, `latest.yml`, `latest-linux.yml` and the macOS zip
  with the installers; the verify step above checks they are there. A
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

Changing the updater, or how the release attaches its files, is one of
the things a release candidate is for: cut one, install it, publish a
second, and watch the first take it.
