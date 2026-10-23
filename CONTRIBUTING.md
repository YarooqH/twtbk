# Contributing to XMarks

Thanks for helping out. Bug reports, fixes, and ideas are all welcome.

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Reporting bugs and asking for features

- Search the [existing issues](https://github.com/YarooqH/xmarks/issues) first.
- Use the bug report or feature request template. For bugs, the browser, the XMarks version and the steps to reproduce matter most.
- X changes its page markup often, and that's the most common reason the save button or Sync Bookmarks stops working. If that happens, say which page broke and roughly when.
- Security problems go through [private reporting](SECURITY.md), not a public issue.

## Before you start on a change

For anything bigger than a small fix, open an issue first so we can agree on the approach before you spend time on it.

## Setting up

You need [Node.js](https://nodejs.org/) 20.19+ or 22.12+ and a Chromium browser (Chrome, Edge, Brave and so on).

```bash
git clone https://github.com/YarooqH/xmarks.git
cd xmarks
npm install
npm run dev
```

`npm run dev` builds into `dist/` and rebuilds when you save. Load `dist/` with **Load unpacked** on `chrome://extensions` (Developer mode on), then click the extension's reload button after a change to the content script or the service worker.

The README's [Development](README.md#development) section maps out where things live in `src/`.

## Making the change

- Keep pull requests focused: one fix or feature per PR.
- Add or update tests for logic you change. Tests sit next to the code as `*.test.ts` and run with Vitest.
- Code that reads X's page (the files in `src/content/`) should fail quietly when the markup it expects isn't there, rather than breaking the page.
- Library data stays in the browser. Changes that send data anywhere, or add permissions or host access, need a very good reason and a note in the PR.
- If you change something users can see, update the README and the [landing page](landing/) when they describe it.

Before opening a PR, run:

```bash
npm test
npm run lint
npm run build
```

## Commits and pull requests

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), for example `fix(content): keep the save button after X re-renders a post` or `feat(dashboard): sort by author`. Common types are `feat`, `fix`, `docs`, `refactor`, `test`, `build` and `chore`.

Fill in the pull request template. For UI changes, include a screenshot or a short recording.

## Screenshots and the demo GIF

The README's images come from scripts in `store-assets/`. They run the built extension against a fictional X timeline. See [Development](README.md#development) for how to regenerate them.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
