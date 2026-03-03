---
title: File Structure
---

# File Structure

This is the canonical HyperTillDB repository layout.

```text
hypertillDb/
  src/
    index.js                  # package root exports
    core/                     # low-level Watermelon-compatible internals
    reactive/                 # reactive primitives and hooks substrate
    hypertill.js              # main HyperTill API exports
    modeling/                 # model DSL helpers
    typeFirst/                # createDB/dbModel/defineModels/relation runtime
    runtime/                  # reactive runtime client
    generator/                # Node-only generation helpers (CLI path)
  docs/                       # canonical docs source (Docusaurus input)
    HyperTillDB/              # product docs
    Implementation/           # maintainer docs
  docs-website/               # Docusaurus site app
  scripts/                    # build/publish/dev scripts
  HYPERTILLDB_TYPE_FIRST_PLAN.md
  HYPERTILLDB_CHANGE_TRACKER.md
```

## Boundaries

1. `src/{modeling,typeFirst,runtime,generator}` is the primary DX surface.
2. `src/core/*` remains available under `core` namespace for advanced usage.
3. `src/generator/*` is Node-only and must never be imported by app runtime entrypoints.
4. `docs/` is source of truth for docs content.

## Platform safety

1. Web/runtime entrypoints must avoid Node built-ins.
2. Web adapter resolution must use `*.web.js` variants when bundling for browser/Expo web.
3. SQLite node bridges are server/node-only and must stay behind non-web dispatch paths.
