# Stoop for the desktop

A thin Electron shell around [Stoop](https://github.com/getstoop/stoop).
It loads the web app each server already serves, so there is nothing here
to keep in step with the server: one new endpoint on the server side
(`GET /version`) and one small object the shell injects into the page
(`window.stoop`). The contract between the two is
[docs/architecture/desktop.md](https://github.com/getstoop/stoop/blob/main/docs/architecture/desktop.md)
in the server repository.

## Which builds are signed

There is no release yet. CI builds an installer for macOS, Windows and
Linux on every push. A release's macOS installer is signed; nothing
else is, and each system warns before it opens one of those:

- **macOS**, built for a release, is signed with a Developer ID and
  notarized by Apple, and opens like any other app. A build from a push
  or a pull request is not signed, and macOS refuses it on first open.
  Open it once, then allow it under System Settings → Privacy &
  Security → Open Anyway. An unsigned build may also show no
  notifications: macOS attributes a banner to a signed identifier and
  drops the ones it cannot attribute.
- **Windows** shows SmartScreen's "Windows protected your PC". More info
  → Run anyway.
- **Linux** packages carry no signature. An AppImage has to be made
  executable before it runs (`chmod +x`).

Only get past these warnings for a build you made yourself or took from
this repository. Signing for Windows is next; its entry here goes when
that lands.

## Who is responsible

The project hosts no servers and sees nothing that passes through one.
Whoever runs a server answers for what happens on it, and whoever uses
the app answers for what they do with it.

## Run it

```
pnpm install
make dev        # electron-vite with --watch; `make lint`, `make test`, `make build`, `make package` too
```

The main process and the preload scripts rebuild and relaunch the app
when they change; the app's own pages hot-reload from a Vite server on
:5180. Add `http://localhost:8091` on the first page: the server
repository's `make dev` serves the live web app there, so changes in
either repository show up without a rebuild. `make dev` prints the
branch it runs and warns when `origin/main` has commits this checkout
lacks.

Type a server address on the first page. Servers are kept in
`servers.json` under the app's data directory, each in its own session
partition, and switched from the menu in the title strip or with ⌘1
to ⌘9. The theme is the app's: chosen under App settings → Appearance,
kept in `settings.json`, worn by every screen the app draws, and handed
whole (every token) to each server's page through `window.stoop.theme`,
so the web app wears it too and hides its own picker. `src/shared/themes.ts`
is the app's copy of the web app's themes; the shape of a theme (its
tokens, no name) is the contract, so a theme only this side knows still
renders. `pnpm package` builds an installer for this machine into
`dist/`; CI builds all three platforms on every push. A release is a
`v*` tag, which attaches those installers to a draft release:
[docs/releasing.md](docs/releasing.md).

The macOS build is signed when there is a Developer ID Application
certificate to sign with and notarized when there are credentials to
notarize with, and is plainly unsigned otherwise. On this machine that is
the login keychain and a `notarytool` profile named in
`APPLE_KEYCHAIN_PROFILE`. In CI it is five repository secrets, used for
the Release workflow, which runs for a tag and when started by hand on
`main` (Actions → Release → Run workflow), and fails without them:
`MAC_CSC_LINK` (the .p12, base64), `MAC_CSC_KEY_PASSWORD`, and an App
Store Connect API key as `APPLE_API_KEY_P8`, `APPLE_API_KEY_ID`,
`APPLE_API_ISSUER`. What the hardened runtime lets through is
`resources/entitlements.mac.plist`.

## Updates

An installed app keeps itself current from the
[releases](https://github.com/getstoop/desktop/releases). It checks
soon after it starts and every four hours, downloads a new version in
the background, and offers a restart in the title strip, the tray and
App settings → About, which also has a Check now. Nothing is forced:
the download installs when the app next quits either way. A check sends
GitHub the request and nothing else — no account, no identifier. A
build run from a checkout (`make dev`) does not update itself, and an
unsigned macOS build (`make package` without a certificate) finds a
release and cannot install it, which About says. On Linux the AppImage
replaces itself; the `.deb` installs through `pkexec`, which asks for
your password. How a release is made so that this works is in
[docs/releasing.md](docs/releasing.md#updates).

## Deep links

```
stoop://open?server=https://chat.example.com&path=/join/CODE
stoop://auth?server=https://chat.example.com&code=CODE
```

`open` goes to a path on a server: the matching server comes forward and
its view loads the path; an unknown one fills in the add page and waits
for a yes. `auth` is the hand-back from signing in with a provider,
which happens in the system browser because the embedded one is refused
there; it only ever goes to a server already added, and loads that
server's completion route in the view that holds the sign-in, so the
page finds what it left behind. Every path the web app routes is a valid
target; the shell reads none of them, only checks that the address it
builds still belongs to the server the link named.

One instance owns the scheme: a second launch hands its link over and
stops. The scheme is claimed by the installer, so it only works in a
built app — `pnpm package:dir`, open the app once, then
`open "stoop://open?server=…&path=/"`. `make dev` claims the scheme for
the Electron binary running this checkout, which is enough to try the
routing but is not what a person would have. An AppImage has no install
step and may not register the scheme at all; the `.deb` does.

## Layout

```
src/main/       the Electron main process
  window.ts       the one window: the title strip view, one view per server,
                  the page view for the app's own screens, the server menu
  servers.ts      the persisted server list and each server's partition
  probe.ts        GET /version: is it Stoop, which version, what name
  deeplink.ts     stoop:// links: what one may say, and where it may go
  screenshare.ts  answers getDisplayMedia
  updates.ts      the app updating itself from the releases
src/preload/    bridge.ts → window.stoop for server pages
                shell.ts  → window.shell for the app's own pages
src/renderer/   the app's own pages, one directory each:
                add (a server), chrome (the title strip), gate (a server
                that is too old, unreachable, or not Stoop)
src/shared/     the bridge contract and IPC names, imported by both sides
*.test.ts       unit tests, beside the code they cover; `make test` runs them
                in Node with Electron mocked, so nothing launches
resources/      app icons for electron-builder and the tray glyphs; cut in
                the server repo (brand/), copied here by `make brand`
```

Every renderer runs with `contextIsolation`, `sandbox` and no Node
integration; a server page sees `window.stoop` and nothing else.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) says how. Security problems go
through private reporting, not issues: [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE)
