---
title: Contributing
hide_title: true
---

# Contributing to HyperTillDB

This project is now maintained as **HyperTillDB**.

## Local setup

```bash
git clone https://github.com/onchezz/hyperDb.git
cd hyperDb
yarn
```

## Main commands

```bash
npm run build
npm run test:all
npm run docs:dev
```

## Quality bar

Every PR should keep these green:

1. `npm run test`
2. `npm run eslint`
3. `npm run flow`
4. `npm run test:typescript`
5. `npm run tslint`
6. `npm run docs:build`

## Architecture expectations

1. Keep `src/{modeling,typeFirst,runtime,generator}` as the main developer API surface.
2. Keep `src/core/*` as low-level compatibility internals.
3. Do not introduce Node-only imports (`fs`, `path`, etc.) in runtime paths used by Expo/React Native/Web app bundles.
4. Keep web-safe adapter entrypoints (`*.web.js`) for browser builds.

## Docs expectations

1. Update docs in `/docs` when API behavior changes.
2. Update `/HYPERTILLDB_CHANGE_TRACKER.md` with implementation notes and migration-impact summary.
3. Keep examples copy-paste runnable.

## Release checklist

1. Bump version in `package.json`.
2. Run `npm run build:hypertill:npm`.
3. Publish with `npm run publish:hypertill:npm`.
4. Push branch and docs updates.

## GitHub publishing helper

```bash
npm run publish:hypertill:repo -- onchezz hyperDb public
```

## Commit style

1. Prefer focused commits by feature area.
2. Add tests with behavior changes.
3. Document assumptions in code comments only when non-obvious.
