---
title: Troubleshooting
---

# Troubleshooting

## GitHub Pages 404 / Page Not Found

If docs load as 404, your `baseUrl` likely does not match the deployed path.

### Use the right URL pattern

- Project pages: `https://<owner>.github.io/<repo>/`
- User/org pages: `https://<owner>.github.io/`

For `https://onchezz.github.io/docs`, set:

- `DOCS_BASE_URL=/docs/`

For `https://onchezz.github.io/hypertilldb`, set:

- `DOCS_BASE_URL=/hypertilldb/`

### Current config behavior

`docs-website/docusaurus.config.js` now resolves `baseUrl` as:

1. `DOCS_BASE_URL` when set
2. inferred from `DOCS_REPO_OWNER` + `DOCS_REPO_NAME`

## Docusaurus site did not load properly

Usually caused by one of:

1. `baseUrl` mismatch
2. wrong `projectName` or `organizationName`
3. stale `gh-pages` deployment assets

## Expo Web bundling error: `better-sqlite3` not found

Cause: web build tried to load SQLite node/native path.

Fix in HyperTillDB:

- web guard files added for SQLite adapter
- SQLite adapter throws clear runtime guidance on web

What to do in app code:

- Native: `@onchez/hypertilldb/adapters/sqlite`
- Web: `@onchez/hypertilldb/adapters/lokijs`

## `@onchez/hypertilldb` cannot be found in app

Verify dependency and reinstall:

```bash
npm ls @onchez/hypertilldb
npm install
```

For native changes, rebuild app:

```bash
npx expo run:android
# or
npx expo run:ios
```

## TypeScript error `TS5053` (`emitDeclarationOnly` with `noEmit`)

Use separate configs:

- `tsconfig.json` for checking (`noEmit: true`)
- `tsconfig.build.json` for declaration emit (`emitDeclarationOnly: true`)

## Generator blocks destructive change

Error means a destructive model diff was detected.

Add explicit mapping file:

- `hypertill/hypertill.migration-map.ts` (or `.js`)

Then rerun:

```bash
hypertill generate
```
