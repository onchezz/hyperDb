---
title: HyperDB Overview
---

# HyperDB Overview

HyperDB is a local-first data layer that extends WatermelonDB with a more ergonomic application API and integration patterns.

HyperDB is not a replacement engine for WatermelonDB. It is built on top of WatermelonDB:

- Storage engine: WatermelonDB (SQLite/Loki adapter layer)
- Query and observation backbone: WatermelonDB query engine and observables
- HyperDB additions:
  - Supabase-style local query client (`createReactiveClient`)
  - React query hooks and render helpers (`useReactiveQuery`, `useReactiveSingle`, `ReactiveQuery`)
  - Peer-sync transport primitives for secure LAN/WebRTC/Bluetooth app channels

## Goals

1. Keep WatermelonDB performance and local-first guarantees.
2. Reduce application boilerplate for query and subscription code.
3. Keep sync transport ownership in app space, while standardizing message flow and security hooks.
4. Work cleanly in React Native and Expo native builds.

## HyperDB vs WatermelonDB

| Capability | WatermelonDB | HyperDB |
| - | - | - |
| Local storage | Yes | Yes (same storage foundation) |
| Observable queries | Yes | Yes |
| Supabase-style local query chaining | No | Yes |
| React query hooks for chain API | No | Yes |
| Peer transport sync helpers | No | Yes |
| Backward compatibility with existing models/schema | N/A | Yes |

## Core packages and imports

HyperDB package namespace for consumers:

```ts
import { Database, createReactiveClient } from '@onchezz/hyperdb'
import SQLiteAdapter from '@onchezz/hyperdb/adapters/sqlite'
import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'
import { createPeerSyncClient, startPeerSyncServer } from '@onchezz/hyperdb/sync'
```

Internal implementation still relies on WatermelonDB internals and package layout.

## Typical usage model

1. Define schema and models using WatermelonDB semantics.
2. Initialize `Database` with adapter.
3. Build `reactive` client with `createReactiveClient(database)`.
4. Read data in UI with `useReactiveQuery(() => reactive.from(...), deps)`.
5. Perform writes with chain API (`insert`, `update`, `upsert`, `delete`).
6. Add peer sync transport only if needed.

## API envelope contract

Most HyperDB chain operations return:

```ts
type ReactiveResponse<T> = {
  data: T | null
  error: Error | null
}
```

This enables consistent handling and very explicit error branches in UI and service layers.

## Recommended production architecture

- Keep the raw `reactive` client inside data/service modules.
- Expose domain-focused methods (`tasks.create`, `tasks.fetchOpen`, `tasks.clearCompleted`).
- Keep React components mostly declarative and side-effect light.
- Treat peer channels as untrusted and always enforce encrypted codec + authorization.

## Next reads

- [HyperDB Architecture](/HyperDB/Architecture)
- [Local-First Query API](/HyperDB/LocalFirstApi)
- [HyperDB API Reference](/HyperDB/ApiReference)
- [React Integration](/HyperDB/ReactIntegration)
- [Practical Examples](/HyperDB/Examples)
- [Expo Native Setup](/HyperDB/ExpoSetup)
- [Migration Guide](/HyperDB/MigrationGuide)
- [Peer Sync Security](/HyperDB/PeerSyncSecurity)
- [Publishing and Versioning](/HyperDB/Publishing)
- [Troubleshooting (including Page Not Found analysis)](/HyperDB/Troubleshooting)
