---
title: Sync Engine
---

# Sync Engine

This page defines the HyperTillDB vNext sync architecture.

## Objectives

1. Sync only changed rows/fields.
2. Keep local writes instant.
3. Recover from offline periods.
4. Support backend sync and optional peer relay.
5. Emit lifecycle events for app UI and telemetry.

## Core data structures

### `oplog`

Append-only local log of pending operations.

Suggested fields:

- `op_id`
- `table`
- `record_id`
- `patch`
- `client_ts`
- `origin` (`local` | `peer`)
- `status` (`pending` | `sent` | `acked` | `failed`)

### `sync_state`

- `last_pull_cursor`
- `last_push_at`
- `last_success_at`
- `last_error`
- `retry_count`

### `merge_meta` per row

- `updated_at`
- `updated_by`
- `version` or vector marker

## Sync cycle

### Push phase

1. Read pending oplog entries in bounded batches.
2. Send to backend `/sync/push` with device id + session metadata.
3. Mark accepted entries as `acked`.
4. Keep rejected entries for retry/resolution.

### Pull phase

1. Request `/sync/pull` with last cursor.
2. Receive only deltas after cursor.
3. Apply deltas in transactional batches.
4. Update pull cursor atomically.

### Merge phase

Run conflict policy per record when local and remote both changed.

## Conflict policies

Base policies:

- `server_wins`
- `client_wins`
- `last_write_wins`
- `field_merge`
- custom callback

Custom callback signature (proposed):

```ts
type ConflictResolver = (args: {
  table: string
  id: string
  local: Record<string, unknown>
  remote: Record<string, unknown>
  localMeta: { updatedAt: number; deviceId: string }
  remoteMeta: { updatedAt: number; source: string }
}) => Record<string, unknown>
```

## Event bus

Required events:

- `sync:scheduled`
- `sync:push:start` / `sync:push:done`
- `sync:pull:start` / `sync:pull:done`
- `sync:merge:conflict`
- `sync:error`
- `sync:idle`

These events let UI show "syncing", "up to date", and "retrying" states.

## Incremental patching

Prefer field-level patches over full-row replacement.

Patch format can be:

- partial object patches
- JSON Patch operations

Server and client must agree on patch semantics and validation.

## Peer relay mode

When no internet exists:

1. peer channel exchanges encrypted deltas
2. local DB applies deltas and records provenance
3. internet restore triggers upstream reconciliation

Peer relay does not replace backend authority.

## Ditto research takeaways applied to HyperTillDB

We should adopt:

- explicit sync lifecycle control (`startSync` / `stopSync` style)
- resumable peer/server sessions with durable checkpoints
- LAN/nearby device relay as first-class offline path

We should design around:

- web runtimes where direct P2P support may be limited
- background sync limitations when app/device is suspended
- at-rest encryption responsibility staying with the app/platform

## Offline auth integration

Sync should check auth state before push/pull.

Recommended behavior:

- if token valid: run sync
- if token expired but offline grace valid: allow local writes, queue push
- if grace expired: emit `auth:reauth_required`, pause push, keep local mode

Config (proposed):

```ts
const authPolicy = {
  offlineSessionTtlMs: 24 * 60 * 60 * 1000,
  reauthMode: 'biometric_then_expiry',
}
```

## Performance controls

- bounded batch size (for example 100-500 ops)
- adaptive retry backoff
- transaction chunking for large pulls
- periodic compaction of acked oplog entries

## Failure recovery

1. Persist sync state before and after each phase.
2. On restart, resume from last durable cursor.
3. Keep idempotent apply semantics.
4. Never lose pending oplog entries on transient failure.

## Research references

- PostgreSQL logical replication: [postgresql.org/docs/current/logical-replication.html](https://www.postgresql.org/docs/current/logical-replication.html)
- RFC 6902 JSON Patch: [datatracker.ietf.org/doc/html/rfc6902](https://datatracker.ietf.org/doc/html/rfc6902)
- WebRTC RTCPeerConnection: [developer.mozilla.org/Web/API/RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- Ditto overview: [docs.ditto.live/home](https://docs.ditto.live/home)
- Ditto FAQ: [docs.ditto.live/sdk/latest/faq](https://docs.ditto.live/sdk/latest/faq)
