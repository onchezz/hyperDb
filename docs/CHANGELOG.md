---
title: Changelog
hide_title: true
---

# HyperTillDB Changelog

All notable changes for HyperTillDB are documented here.

## 0.0.1 - 2026-03-03

### Added

1. New primary package identity: `@onchez/hypertilldb`.
2. Main entrypoint configured for package consumers (`main: dist/index.js`).
3. New v2-first API surface exposed from package root:
   - `createDB`
   - `dbModel`
   - `defineModels`
   - `relation`
   - `createHyperTill`
4. Web-safe SQLite adapter entrypoints (`index.web.js` dispatcher guard).
5. Type-first runtime files under `src/typeFirst/*`.
6. Dedicated CLI wrapper entry (`cli.js`) for generator commands.

### Changed

1. Docs theme and branding updated to HyperTillDB.
2. Docusaurus now reads canonical docs from repo `/docs`.
3. CI now runs on pushes to both `main` and `master`.

### Removed

1. Legacy Watermelon-focused docs sections that are not part of HyperTillDB public docs.
2. Legacy enhanced-fork docs pages and references.

### Notes

HyperTillDB still uses Watermelon internals as a substrate, but the public DX and docs are now HyperTill-first.
