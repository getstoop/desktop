# Contributing

Thanks for looking. Stoop is a small project with one maintainer, so the
rules below exist to keep it small.

## Before you start

- **Bugs and small fixes:** open an issue or a PR straight away.
- **Anything bigger** (a feature, a new setting, a change to the
  bridge): open an issue first and say what you want to change and why.
  The roadmap lives in a private tracker for now; issues are how it
  becomes visible. A short conversation before the work saves a long
  one after.
- **Is it this repository's?** The app is a shell around the web app a
  server serves. What happens inside a server's page (messages,
  channels, voice, its settings) belongs to
  [getstoop/stoop](https://github.com/getstoop/stoop). The window, the
  title strip, the server list, App settings, the tray, `stoop://`
  links and the installers belong here.
- Read [docs/vision.md](https://github.com/getstoop/stoop/blob/main/docs/vision.md)
  in the server repository for what Stoop is trying to be, and
  [docs/architecture/desktop.md](https://github.com/getstoop/stoop/blob/main/docs/architecture/desktop.md)
  there for the contract between the app and a server.

## Making a change

Getting a dev environment running is in the [README](README.md) (Run
it), and the layout of the source is there too. In short:

- `make lint`, `make test` and `make build` from the repo root. `make lint`
  runs the linter, the typecheck and the id check; `make test` runs the
  unit tests, which sit beside the code as `*.test.ts` and need no
  server and no running app.
- `make dev` wants a server to talk to. The server repository's
  `make dev` serves one at `http://localhost:8091`.
- The bridge (`src/shared/`) is a contract with the server. A change to
  it needs the matching change to `docs/architecture/desktop.md` in the
  server repository, and the two land together.
- Small files, few comments that say what the code already says. The
  ones that stay explain why.
- Test data uses invented people. No real names, emails or hostnames in
  fixtures, docs or screenshots.

## AI-generated code

Welcome, on one condition: the person opening the PR understands the
code and can answer for it. You are the author of record. Be able to
say what each part does and why it is there, take part in the review
yourself, and answer questions in your own words. A PR whose only
explanation is "the tool wrote it" will be closed, not reviewed. The
same goes for review comments: post them because you agree with them,
not because a tool produced them.

## Pull requests

- Branch from `main`, one change per PR, with a description that says
  what changed and why.
- `main` only merges with every CI job green. CI for a PR from a fork
  runs after a maintainer approves it, so a first PR may wait a little.
- CI builds an installer for every platform. If the change is to how
  the app behaves on one of them, say which you ran it on.
- Reviews are about the change, not the person. Expect questions;
  expect to be asked to split something.

## Security

Not here: see [SECURITY.md](SECURITY.md).

## License

By contributing you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE), like the rest of the project.
