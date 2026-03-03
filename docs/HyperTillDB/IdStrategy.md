---
title: IDs and Metadata
---

# IDs and Metadata

HyperTillDB should treat IDs and sync metadata as first-class, backend-compatible primitives.

## UUIDv4 support

HyperTillDB now exposes UUIDv4 helpers:

```ts
import { useUuidV4IdGenerator, uuidv4, createDB } from '@onchez/hypertilldb'

useUuidV4IdGenerator()

const db = createDB({
  name: 'app',
  database,
  models,
  reactiveOptions: {
    idGenerator: uuidv4,
  },
})
```

This enables ID compatibility with backend systems that use UUIDs (for example Postgres/Supabase deployments).

Relevant references:

- UUID spec: [rfc-editor.org/rfc/rfc9562](https://www.rfc-editor.org/rfc/rfc9562)
- PostgreSQL `gen_random_uuid()`: [postgresql.org/docs/current/functions-uuid.html](https://www.postgresql.org/docs/current/functions-uuid.html)

## Recommended system metadata columns

Per table, include:

- `created_at` (number/timestamp)
- `updated_at` (number/timestamp)
- `deleted_at` (nullable timestamp)
- `origin_device_id` (string)
- `last_synced_at` (nullable timestamp)
- `sync_status` (enum-like string)

## Why this metadata matters

- accurate incremental pulls (`updated_at` + cursor)
- tombstone-safe deletes (`deleted_at`)
- conflict debugging (`origin_device_id`)
- UX status indicators (`last_synced_at`, `sync_status`)

## API envelope convention

Return metadata with records in local API results so service layers do not lose sync state.

```ts
type SyncMeta = {
  created_at: number
  updated_at: number
  deleted_at: number | null
  origin_device_id: string
  last_synced_at: number | null
  sync_status: 'pending' | 'synced' | 'failed' | 'conflict'
}
```

## Clock and ordering guidance

- use monotonic server cursor for backend truth
- keep local timestamps for user feedback only
- never rely on client time alone for final conflict decisions

## Implementation guidance

- ID generation must be deterministic in tests (inject custom generator)
- do not expose mutable ID updates after insert
- validate UUID shape at API boundaries when required by backend adapter
