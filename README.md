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
pnpm dev
```

Type a server address on the first page. `pnpm package` builds an
installer for this machine into `dist/`; CI builds all three platforms on
every push.

## Layout

```
src/main/       the Electron main process: windows, badge, IPC
src/preload/    bridge.ts → window.stoop for server pages
                shell.ts  → window.shell for the app's own pages
src/renderer/   the app's own pages (today: the add-server page)
src/shared/     the bridge contract and IPC names, imported by both sides
resources/      icons for electron-builder
```

Every renderer runs with `contextIsolation`, `sandbox` and no Node
integration; a server page sees `window.stoop` and nothing else.
