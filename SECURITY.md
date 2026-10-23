# Security policy

## Supported versions

Only the latest release, and the `master` branch it's built from, get security fixes.

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately instead:

1. Open the [Security tab](https://github.com/YarooqH/xmarks/security) of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and what an attacker could do with it.

Only the maintainers can see the report. You should hear back within a week. Once a fix is out, the advisory is published, with credit to you if you'd like it.

## What's in scope

XMarks runs entirely in your browser. It has no server or account, and it keeps your library in IndexedDB. Things worth reporting include:

- A way for a web page, including x.com itself, to read or change your XMarks library.
- Script injection through post text, author names, notes, tags or an imported JSON file.
- The extension sending library data anywhere, or running code that isn't part of the extension package. The only expected downloads are images from X and the optional auto-categorize model from Hugging Face.
- Permissions or host access broader than the extension needs.

Out of scope: problems that need someone who already controls your browser profile or computer, and bugs in X, Chrome or other browsers themselves.
