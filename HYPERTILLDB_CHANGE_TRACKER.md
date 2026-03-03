# HyperTillDB Change Tracker

This file tracks implementation changes, cleanup scope, consistency decisions, and verification status for HyperTillDB.

## Canonical Structure

```text
/Users/onchez/projects/watermelon-enhance/hypertillDb/
  src/
    index.js, index.d.ts
    core/
    reactive/
    adapters/
    hypertill.js, hypertill.d.ts
    modeling/
    typeFirst/
    runtime/
    generator/
  docs/
    README.md
    CONTRIBUTING.md
    CHANGELOG.md
    HyperTillDB/
    Implementation/
  docs-website/
    docusaurus.config.js
    sidebars.js
    src/
    static/
  scripts/
  package.json
  cli.js
```

## Consistency Rules

1. Keep `src/{modeling,typeFirst,runtime,generator}` as primary API and `src/core/*` as advanced namespace (`core`).
2. Keep runtime entrypoints free of Node built-ins for Expo/web safety.
3. Keep one mutation result shape for create/update/delete/bulk operations.
4. Keep generated naming predictable: `db.books`, `db.useBooks`, `db.useBooksByAuthorId`.
5. Keep docs source in `/docs` only (single source of truth).
6. Keep CI + local commands aligned (`npm run test:all`).

## Cleanup Log

### 2026-03-03

Scope: Main/package/github normalization + legacy cleanup.

Changes:

1. Package/GitHub:
   - ensured package main entry is `dist/index.js`
   - added `publish:hypertill:repo` script
   - added `scripts/publish-hypertill-repo.sh`
   - updated CI workflow to run on `main` and `master`
2. Docs pipeline:
   - switched Docusaurus docs path to canonical `/docs`
   - changed docs edit URL to `/docs/` location
   - simplified `scripts/update-docusaurus` to validate canonical docs source
3. Legacy docs cleanup:
   - removed old Watermelon-oriented docs trees (`docs/Advanced/*`, `docs/Sync/*`)
   - removed unused legacy pages (`CRUD`, `Model`, `Query`, `Schema`, `Setup`, `Writers`, etc.)
   - replaced old implementation docs with:
     - `docs/Implementation/FileStructure.md`
     - `docs/Implementation/CodeConsistency.md`
     - `docs/Implementation/ChangeTracking.md`
4. HyperTill docs normalization:
   - rewrote `docs/CONTRIBUTING.md` for HyperTillDB workflow
   - rewrote `docs/CHANGELOG.md` for HyperTillDB release history
5. Source layout flattening:
   - moved all Type-first modules from `src/v2/*` into top-level `src/*`
   - new canonical modules:
     - `src/hypertill.js`, `src/hypertill.d.ts`
     - `src/modeling/*`
     - `src/typeFirst/*`
     - `src/runtime/*`
     - `src/generator/*`
     - `src/cli.js`
   - updated root exports and CLI wrappers to remove `dist/v2/*` paths

Files to remove next (legacy names):

1. `ENHANCED_DB_DOCUMENTATION.md`
2. `ENHANCEMENTS.md`
3. `NPM_PACKAGE_SETUP.md`
4. `PUBLISH_TO_GITHUB.md`
5. `scripts/build-enhanced-npm-package.sh`
6. `scripts/publish-enhanced-npm.sh`
7. `scripts/publish-enhanced-repo.sh`

## Verification Log

Executed on 2026-03-03:

1. `npm run test` -> pass (89 suites, 775 passed, 23 skipped)
2. `npm run eslint` -> pass
3. `npm run flow` -> pass (`Found 0 errors`)
4. `npm run test:typescript` -> pass
5. `npm run tslint` -> pass
6. `npm run docs:build` -> pass (`Generated static files in "build"`)

Composite gate:

1. `npm run test:all` -> pass

Notes:

1. `src/{modeling,typeFirst,runtime,generator}` is currently marked `@noflow` and validated through TypeScript + Jest while Flow coverage remains for legacy/core paths.

Final results are recorded after command completion.
