# Security policy

## Reporting a vulnerability

I welcome and appreciate good faith vulnerability reports.

Please do not open a public issue for a security problem. Use GitHub's
private vulnerability reporting: the **Security** tab of this repository →
**Report a vulnerability**. It reaches the maintainer only.

Include what you can: the app's version (App settings → About), the
operating system and its version, how the app was installed (`.dmg`,
the Windows installer, AppImage, `.deb`, or built from source), and
steps to reproduce. A proof of concept against your own server is
welcome; please don't test against servers you don't run.

Fixes may ship as a patch release with a note in the release notes
crediting the reporter, unless they prefer otherwise.

## Supported versions

The newest release. Older versions are not patched, so staying current
is the supported path. Until the first release there is only `main`.

## Scope

In scope: the desktop app in this repository. That is the main process,
the preload scripts and the bridge they expose (`window.stoop`,
`window.shell`), the app's own pages, `stoop://` links, and the
installers CI builds.

Out of scope:

- The Stoop server and the web app it serves. Report those to
  [getstoop/stoop](https://github.com/getstoop/stoop/security/advisories/new).
- Electron and Chromium themselves (report to them directly), unless
  the problem is that this app ships a version with a known fix
  outstanding.
- That the Windows and Linux builds are unsigned. It is known, and the
  README says so.

## What the app's trust model is

The app loads the web app of each server a person adds, so adding a
server is trusting it with what a browser tab would give it. Each
server is kept in its own session partition, and its page sees
`window.stoop` and nothing else: every renderer runs with
`contextIsolation`, `sandbox` and no Node integration.

Reports that a server can do what any web page can do in a browser are
not vulnerabilities. Reports that a server's page can reach past the
bridge, read another server's session, touch the file system, or send
the app somewhere a `stoop://` link should not be able to are exactly
what this policy is for.
