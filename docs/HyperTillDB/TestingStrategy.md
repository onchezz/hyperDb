---
title: Testing Strategy
---

# Testing Strategy

HyperTillDB requires layered testing to keep local-first behavior predictable.

## Testing objectives

1. determinism of generated schema/migrations
2. correctness of reactive updates
3. sync convergence under unreliable networks
4. security and auth failure hardening
5. parity across mobile and web

## 1) Unit tests

### Model/generator tests

- parser accepts valid model DSL
- invalid model definitions fail with clear messages
- generated schema output is deterministic
- generated hooks/types are deterministic

### Migration diff tests

- additive changes generate valid migration
- rename/drop without mapping is rejected
- snapshots are updated correctly

### Sync policy tests

- each built-in conflict strategy returns expected merge result
- custom resolver contract works

## 2) Integration tests

Run against local DB adapters.

- generated schema boots database
- query API reads expected rows
- updates emit reactive changes to subscribers
- deletes follow sync-safe behavior

## 3) Sync simulation tests

Use deterministic fake transport/server.

Scenarios:

1. offline writes then reconnect push
2. out-of-order delta delivery
3. duplicate packet replay
4. simultaneous local + remote edit conflict
5. peer relay then upstream reconciliation

## 4) Security tests

- tampered payload rejected
- stale nonce rejected
- unauthorized peer rejected
- schema version mismatch rejected
- session expiration triggers auth event and sync pause

## 5) E2E tests

### Mobile (Expo native)

- create book/chapter/note offline
- app restart preserves local state
- reconnect syncs to backend
- second device receives updates

### Web

- same model definitions compile
- generated hooks behave consistently
- sync lifecycle events visible in UI state

## Test matrix

Minimum matrix:

- platform: iOS, Android, Web
- adapter: SQLite, web-compatible adapter
- mode: online, offline, peer-only
- auth: valid, expired-within-grace, expired-outside-grace

## CI recommendations

1. run unit + integration on every PR
2. run deterministic sync simulation suite on every PR
3. run full mobile/web E2E nightly
4. fail build if generator output is dirty after test run

## Release gate checklist

1. no failing tests in any matrix dimension
2. migration snapshots committed
3. sync regression suite green
4. security test suite green
5. docs/examples updated for changed APIs
