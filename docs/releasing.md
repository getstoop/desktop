# Releasing Stoop for the desktop

A release is a tag: a minor on `main`, a patch on a `release/X.Y` branch
off the previous tag. Pushing it runs the Build workflow, which makes a
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
   universal `.dmg`, a Windows installer, an AppImage and a `.deb`.
5. **Verify against the draft.** Download each installer from the draft
   and install it on a clean machine. Add a server, sign in, join voice.
   Check that App settings → About shows the version. Install over the
   previous release and check that the server list and the settings
   survived.
6. **Publish the draft.** Read the notes as they came out, then
   publish. Anything wrong after that becomes a patch release; the tag
   is never moved.

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

CI builds the installers on every push, so packaging is exercised all
the time. The steps that run only for a tag are not: the version check
against the tag, making the draft, and electron-builder attaching to it.
After changing any of them in `.github/workflows/build.yml`, cut a
release candidate before the release that matters.

The installers are unsigned until signing lands (the README says what
each system does about that), and the app does not update itself: a new
version is a new download.
