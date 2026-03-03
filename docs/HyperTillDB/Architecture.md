---
title: HyperTillDB Architecture
---

# HyperTillDB Architecture

HyperTillDB is a layered system over WatermelonDB.

## Layer stack

1. Storage layer (WatermelonDB adapters)
2. Data layer (collections, queries, writers)
3. HyperTillDB local API layer (`createDB`)
4. React layer (hooks and reactive render helpers)
5. Generation layer (vNext model-first code generation)
6. Sync layer (vNext incremental backend + peer relay)
7. Security/auth layer (session and transport controls)

## Layer responsibilities

### 1) Storage layer

- `SQLiteAdapter` / `LokiJSAdapter`
- schema migrations
- raw record persistence

### 2) Data layer

- query compilation
- change observation graph
- write queue execution

### 3) Local API layer

- chain API (`from`, `eq`, `order`, `fetch`, `insert`, `update`, `delete`)
- stable `{ data, error }` response envelope

### 4) React layer

- automatic subscription lifecycle
- component-safe loading/error states
- no manual subscription `useEffect` required

### 5) Generation layer (vNext)

Input: TypeScript model DSL.

Output:

- Watermelon-compatible schema
- model classes/decorators
- strong row types
- CRUD wrappers
- reactive hooks
- migration snapshots and migration step files

### 6) Sync layer (vNext)

Core pieces:

- `oplog` (local pending operations)
- `pull cursor` and `push checkpoint`
- conflict resolver plugin
- scheduler (foreground + background)
- transport adapters (`http`, `webrtc`, `ble`, `lan`)

Sync adapters should be backend-agnostic so the same local domain layer can target Supabase, SpacetimeDB, CouchDB, or a custom API.

### 7) Security/auth layer

- session freshness checks
- encrypted transport codec
- peer authorization policy
- replay defense (nonce + session counters)

## Dependency graph execution

For dependent models (author -> book -> chapter -> note), HyperTillDB should support:

- parent-first transactional creates
- relation-aware generated hooks
- topological migration ordering
- deterministic delete policy (soft delete + explicit cascades)

## Runtime flow

```text
UI action
-> local write (Watermelon writer)
-> oplog append
-> observer emits immediate local update
-> sync scheduler triggers push/pull
-> merge resolver applies remote delta
-> observers emit minimal changed rows
```

## Event lifecycle

HyperTillDB emits sync and auth lifecycle events for UI and telemetry.

Recommended events:

- `db:init:start`, `db:init:ready`, `db:init:error`
- `sync:queued`, `sync:push:start`, `sync:push:done`
- `sync:pull:start`, `sync:pull:done`
- `sync:merge:start`, `sync:merge:done`, `sync:conflict`
- `sync:error`
- `auth:offline_grace_started`, `auth:reauth_required`

These events enable status indicators without coupling UI to sync internals.

## Conflict resolution model (vNext)

Per-table policy with optional per-field overrides:

- `server_wins`
- `client_wins`
- `last_write_wins` (timestamp based)
- `field_merge`
- custom resolver callback

Conflict resolver input should include:

- local row and change metadata
- remote row and change metadata
- operation origin and timestamps

## Mobile/web adapter strategy

Define one transport interface and bind platform-specific implementation at runtime.

```ts
type SyncTransport = {
  connect(): Promise<void>
  disconnect(): Promise<void>
  send(packet: Uint8Array): Promise<void>
  onMessage(cb: (packet: Uint8Array) => void): () => void
  onStatus(cb: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void): () => void
}
```

This prevents app code from branching per platform in business logic.

## Why this architecture

- keeps local UX instant
- isolates high-risk concerns (sync, auth, transport)
- enables deep tests per layer
- allows gradual adoption in existing WatermelonDB apps

## Research references

- WatermelonDB Sync Intro: [watermelondb.dev/docs/Sync/Intro](https://watermelondb.dev/docs/Sync/Intro)
- WatermelonDB Frontend Sync: [watermelondb.dev/docs/Sync/Frontend](https://watermelondb.dev/docs/Sync/Frontend)
- Expo SQLite docs: [docs.expo.dev/versions/latest/sdk/sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- React Native architecture updates: [reactnative.dev/blog/2025/10/08/react-native-0.82](https://reactnative.dev/blog/2025/10/08/react-native-0.82)
- Supabase Postgres changes stream: [supabase.com/docs/guides/realtime/postgres-changes](https://supabase.com/docs/guides/realtime/postgres-changes)
