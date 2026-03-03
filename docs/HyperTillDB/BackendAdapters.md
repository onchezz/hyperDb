---
title: Backend Adapters and Types
---

# Backend Adapters and Types

HyperTillDB sync should use adapter contracts so any backend can plug in with minimal app code changes.

## Adapter contract (proposed)

```ts
type PullRequest = {
  cursor: string | null
  schemaVersion: number
  clientId: string
}

type PullResponse = {
  cursor: string
  changes: Record<string, unknown>
}

type PushRequest = {
  cursor: string | null
  changes: Record<string, unknown>
  clientId: string
}

type PushResponse = {
  acceptedIds: string[]
  rejected: Array<{ id: string; reason: string }>
  cursor?: string
}

type BackendSyncAdapter = {
  pull(args: PullRequest): Promise<PullResponse>
  push(args: PushRequest): Promise<PushResponse>
}
```

## Environment-driven adapter config

Read backend connection settings from env:

- `HYPERTILL_BACKEND_KIND` (`supabase`, `spacetimedb`, `couchdb`, `custom`)
- `HYPERTILL_SYNC_URL`
- `HYPERTILL_SYNC_TOKEN`
- backend-specific keys

## Supabase adapter shape

Use Postgres change feeds or polling endpoints according to project constraints.

References:

- Realtime Postgres changes: [supabase.com/docs/guides/realtime/postgres-changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- Type generation: [supabase.com/docs/guides/api/rest/generating-types](https://supabase.com/docs/guides/api/rest/generating-types)

## SpacetimeDB adapter shape

Use typed reducers/tables and client identity model.

Reference: [spacetimedb.com/docs](https://spacetimedb.com/docs)

## CouchDB adapter shape

Use `_changes` feed and replication checkpoints.

Reference: [docs.couchdb.org](https://docs.couchdb.org/en/stable/replication/protocol.html)

## CLI plan for type generation

Proposed command family:

```bash
npx hypertill types:pull --backend supabase
npx hypertill types:pull --backend spacetimedb
npx hypertill types:emit --out src/generated/backend-types.ts
```

Outputs:

- normalized backend table types
- mapping diagnostics (backend -> local model fields)
- optional adapter stub templates

## Rust backend support plan

Proposed scaffold command:

```bash
npx hypertill scaffold:rust-sync --out backend/
```

Generated artifacts:

- `pull` and `push` endpoint stubs
- cursor/checkpoint persistence hooks
- typed payload structs
- conflict resolver stub
