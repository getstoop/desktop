# Stoop for the desktop

A thin Electron shell around [Stoop](https://github.com/getstoop/stoop).
It loads the web app each server already serves, so there is nothing here
to keep in step with the server: one new endpoint on the server side
(`GET /version`) and one small object the shell injects into the page
(`window.stoop`). The design is `docs/proposals/desktop-client.md` in the
server repository; the contract is `docs/architecture/desktop.md` there.

## Run it

```
pnpm install
make dev        # electron-vite with --watch; `make lint`, `make build`, `make package` too
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
`dist/`; CI builds all three platforms on every push.

## Layout

```
src/main/       the Electron main process
  window.ts       the one window: the title strip view, one view per server,
                  the page view for the app's own screens, the server menu
  servers.ts      the persisted server list and each server's partition
  probe.ts        GET /version: is it Stoop, which version, what name
  screenshare.ts  answers getDisplayMedia
src/preload/    bridge.ts → window.stoop for server pages
                shell.ts  → window.shell for the app's own pages
src/renderer/   the app's own pages, one directory each:
                add (a server), chrome (the title strip), gate (a server
                that is too old, unreachable, or not Stoop)
src/shared/     the bridge contract and IPC names, imported by both sides
resources/      icons for electron-builder
```

The design for these screens lives with the maintainer's proposal
canvas; `docs/proposals/desktop-client.md` in the server repository is
the text.

Every renderer runs with `contextIsolation`, `sandbox` and no Node
integration; a server page sees `window.stoop` and nothing else.
