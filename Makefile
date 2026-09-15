.PHONY: dev dev-git-check lint build package package-dir sign-adhoc clean

## dev: the shell with hot reload — the main process and the preload scripts
## rebuild and relaunch the app on change; its own pages hot-reload from a
## Vite server pinned to :5180. Add http://localhost:8091 as a server: the
## server repo's `make dev` serves the live web app there.
dev: dev-git-check
	@test -d node_modules || { echo "make dev: node_modules missing; run pnpm install" >&2; exit 1; }
	pnpm dev

## dev-git-check: name what is about to run, and warn when origin/main has
## commits this checkout lacks — work lands by PR, so a checkout left on an
## old branch runs old code with nothing else saying so
dev-git-check:
	@git fetch -q origin 2>/dev/null || true; \
	echo "make dev: running $$(git rev-parse --abbrev-ref HEAD) @ $$(git rev-parse --short HEAD)"; \
	behind=$$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0); \
	if [ "$$behind" != 0 ]; then \
	  echo "make dev: WARNING: origin/main has $$behind commit(s) this checkout lacks; git switch main && git pull to run what has landed" >&2; \
	fi

lint:
	pnpm lint
	pnpm typecheck
	pnpm check:ids

build:
	pnpm build

## package: an unsigned installer for this machine, into dist/
package:
	pnpm package

## package-dir: the unpacked app in dist/, for trying a branch on this
## machine without building an installer.
package-dir:
	pnpm package:dir
	@$(MAKE) --no-print-directory sign-adhoc

## sign-adhoc: bind a macOS bundle to its own identifier, ad-hoc. Hung off
## package-dir only: an installer built by `package` carries its own copy
## of the app, so signing the one left in dist/ afterwards would change
## nothing about what ships and only look as though it had.
## electron-builder skips signing when it finds no Developer ID, which
## leaves Electron's own linker signature: the bundle then reports
## `Identifier=Electron` with its Info.plist unbound, and Notification
## Center — which attributes a banner by that identifier — has nothing to
## attribute ours to and drops every one in silence. Ad-hoc signing is
## enough to get them delivered on this machine. It is NOT a substitute
## for signing a release (Desktop 11, 12), and it has to run again after
## every package because the build replaces the bundle. Every bundle in
## dist/ is signed: an old mac-arm64 build left beside a new mac-universal
## one would otherwise be the one signed, and the app launched stays mute.
sign-adhoc:
	@test "$$(uname -s)" = Darwin || exit 0; \
	found=0; \
	for app in dist/mac*/Stoop.app; do \
	  [ -d "$$app" ] || continue; \
	  found=1; \
	  if codesign -dv "$$app" 2>&1 | grep -q "Authority="; then \
	    echo "make sign-adhoc: $$app is properly signed; leaving it alone"; continue; \
	  fi; \
	  echo "make sign-adhoc: ad-hoc signing $$app so macOS will deliver its notifications"; \
	  codesign --force --deep --sign - --identifier com.getstoop.desktop "$$app"; \
	done; \
	[ "$$found" = 1 ] || echo "make sign-adhoc: no Stoop.app in dist/, nothing to sign"

clean:
	rm -rf out dist
