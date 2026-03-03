---
title: Search and Performance
---

# Search and Performance

HyperTillDB should provide fast local search and deterministic transaction behavior across mobile/web.

## Search architecture (proposed)

Use a two-tier approach:

1. indexed filtering/order for structured queries
2. full-text search index for free-text fields

## Structured query performance

- index relation keys (`author_id`, `book_id`, `chapter_id`)
- index sort columns (`updated_at`, `position`)
- avoid full-table scans in hot paths

## Full-text search options

- SQLite FTS (mobile/native SQLite path)
- backend-assisted search for remote/global queries
- local cache of recent search tokens

PostgreSQL text search reference:

- [postgresql.org/docs/current/textsearch.html](https://www.postgresql.org/docs/current/textsearch.html)

## Query API targets

Proposed additions on top of existing chain API:

- `.search(term, options)`
- `.orderByRelevance()`
- `.highlight(fields)`

## Transaction performance targets

- batch writes in one transaction when creating dependency trees
- reduce observer churn by applying patches, not full-row rewrites
- enforce bounded batch size for sync apply

## Suggested SLOs

- local single-table query p95: under 20ms on mid devices
- local dependent query p95: under 40ms
- local write transaction p95: under 30ms
- sync merge batch p95: under 100ms (for bounded batch)

## Measuring speed bumps

Expose metrics hooks:

- `db.query.duration_ms`
- `db.write.duration_ms`
- `sync.push.duration_ms`
- `sync.pull.duration_ms`
- `sync.merge.conflicts`

and emit app-level diagnostics for profiling.

## Expo and web considerations

- keep query and sync logic platform-agnostic
- isolate adapter-specific code by runtime
- ensure search fallback behavior when FTS is unavailable

Expo SQLite SDK reference:

- [docs.expo.dev/versions/latest/sdk/sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
