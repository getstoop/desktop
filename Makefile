.PHONY: dev dev-git-check lint build package clean

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

build:
	pnpm build

## package: an unsigned installer for this machine, into dist/
package:
	pnpm package

clean:
	rm -rf out dist
