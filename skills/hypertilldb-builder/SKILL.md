---
name: hypertilldb-builder
description: Build and evolve HyperTillDB with a model-first local-first architecture on top of WatermelonDB. Use when implementing schema generation, automatic migrations, reactive hooks, sync engine behavior, peer security, offline auth, or testing/release workflows.
---

# HyperTillDB Builder

Use this skill when the task is about building or changing HyperTillDB architecture, APIs, docs, tests, or release setup.

## Outcomes

Deliver changes that are:

1. local-first and performance-safe
2. deterministic in generated outputs
3. sync-safe and conflict-aware
4. secure for peer/offline paths
5. covered by layered tests
6. dependency-graph aware (one-to-many and many-to-many)

## Workflow

### 1) Scope and classify change

Classify request into one or more domains:

- `modeling`: model DSL, schema generation, migrations
- `reactive`: query API, hooks, UI reactivity
- `sync`: oplog, push/pull, conflict resolution, events
- `relations`: dependent model graphs and join-table design
- `ids`: UUID strategy and metadata columns
- `connectors`: backend adapter contracts and env wiring
- `search`: local/indexed/full-text strategy and performance SLOs
- `security`: transport auth, encryption, replay defense
- `auth`: offline session rules and reauth behavior
- `docs`: guides, examples, migration notes, troubleshooting
- `release`: package metadata, docs deployment, npm publish

### 2) Preserve compatibility boundaries

- Keep WatermelonDB core semantics unchanged unless explicitly requested.
- Keep public import paths stable (`@onchez/hypertilldb`, adapter/reactive/sync entrypoints).
- Avoid introducing app-breaking destructive migration behavior automatically.

### 3) For model-first changes

- Treat TypeScript models as source of truth.
- Emit deterministic generated files.
- Block unsafe rename/drop changes unless explicit mapping exists.
- Require snapshot update in same change set.
- Model many-to-many links with explicit join tables.

### 4) For sync changes

- Use incremental deltas, not full-table rewrites.
- Ensure durable cursors/checkpoints.
- Make merge policy explicit and testable.
- Emit sync lifecycle events for UI/telemetry.
- Track per-record and per-session sync status (`pending_peer`, `pending_server`, `synced`, `conflict`).

### 5) For security/auth changes

- Reject unauthenticated peer traffic.
- Require encrypted payload path in production.
- Enforce replay checks (nonce/counter/session).
- Respect offline auth TTL and emit reauth events.
- Treat Wi-Fi hotspot/LAN peer sessions as untrusted networks.

### 6) For IDs and metadata

- Prefer UUIDv4 for cross-backend compatibility when requested.
- Keep ID generation injectable for deterministic testing.
- Standardize metadata fields (`created_at`, `updated_at`, `deleted_at`, sync fields).

### 6) For docs changes

- Keep examples consistent with canonical domain (`books`, `chapters`, `notes`).
- Do not use `project_id` as a required field.
- Keep docs URLs and `baseUrl` aligned with repository pages path.

### 7) Testing gate

At minimum, run relevant checks:

- targeted unit tests for changed modules
- docs build if docs/config changed
- type/lint checks where applicable

If a test cannot run, state what was not run and why.

## Quality checklist

Before finishing, confirm:

1. no stale naming references (`hyperDb`, old routes) unless intentionally preserved
2. no dead imports or broken links
3. new behavior explained in docs/examples
4. migration and sync assumptions are explicit
5. risk areas have tests or clearly documented gaps
