---
title: Code Consistency
---

# Code Consistency Rules

## API consistency

1. Keep one mutation contract across models:
   - `{ data, error, loading, status, progress }`
2. Keep naming stable:
   - model APIs under plural tables (`db.books`)
   - root hooks as `db.useBooks(...)`
   - relation hooks as `db.useBooksByAuthorId(...)`
3. Keep system columns consistent:
   - `id`, `created_at`, `updated_at`, optional `deleted_at`

## Type consistency

1. Keep type-first declarations strict.
2. Avoid `any` and `unknown` in public API typing.
3. Keep camelCase app fields mapped to snake_case storage columns.

## Runtime consistency

1. Never import Node-only modules in mobile/web runtime paths.
2. Keep relation metadata deterministic in `defineModels()`.
3. Keep soft/hard delete behavior explicit per model.

## Documentation consistency

1. Every API change updates docs in `/docs/HyperTillDB`.
2. Every structural or behavior change updates `/HYPERTILLDB_CHANGE_TRACKER.md`.
3. Examples should compile with current exported APIs.

## Review checklist

1. Does this change alter runtime behavior?
2. Are tests updated for that behavior?
3. Are docs/examples aligned with final code?
4. Is web/native adapter behavior still safe?
