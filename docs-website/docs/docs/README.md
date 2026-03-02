---
title: HyperDB Documentation
hide_title: false
slug: /docs
---

# HyperDB Documentation

HyperDB is a local-first reactive data layer built on top of WatermelonDB.

This documentation is split into two parts:

1. **HyperDB guides**: new API layer, React integration, peer sync, Expo setup, publishing
2. **Watermelon core reference**: schema/models/query/sync internals inherited from upstream semantics

## What HyperDB adds

HyperDB extends WatermelonDB with application-focused ergonomics:

- Supabase-style local query API (`createReactiveClient`)
- React wrappers for reactive reads without manual subscription plumbing
- Peer sync helper primitives for secure same-network transport implementations

## What stays from WatermelonDB

HyperDB intentionally preserves WatermelonDB foundations:

- Local storage adapters (`SQLiteAdapter`, `LokiJSAdapter`)
- Query execution model and observation graph
- Schema + migration model
- Record lifecycle and sync-safe deletion semantics

## HyperDB quickstart

### Install

```bash
npm install @onchezz/hyperdb
```

### Bootstrap database

```ts
import { Database } from '@onchezz/hyperdb'
import SQLiteAdapter from '@onchezz/hyperdb/adapters/sqlite'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'hyper_db',
  jsi: true,
  onSetUpError: console.error,
})

export const database = new Database({
  adapter,
  modelClasses: [Task],
})
```

### Create the local-first query client

```ts
import { createReactiveClient } from '@onchezz/hyperdb'

export const reactive = createReactiveClient(database)
```

### Query example

```ts
const { data, error } = await reactive
  .from('tasks')
  .eq('project_id', projectId)
  .order('position', { ascending: true })
  .fetch()

if (error) throw error
```

### React hook example

```tsx
import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'

function TasksScreen({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useReactiveQuery(
    () => reactive.from('tasks').eq('project_id', projectId).order('position', { ascending: true }),
    [projectId],
  )

  if (isLoading) return null
  if (error) return <Text>{error.message}</Text>

  return (data ?? []).map((task) => <TaskRow key={task.id} task={task} />)
}
```

## HyperDB documentation map

### Core guides

- [HyperDB Overview](./HyperDB/Overview.md)
- [HyperDB Architecture](./HyperDB/Architecture.md)
- [Local-First Query API](./HyperDB/LocalFirstApi.md)
- [API Reference](./HyperDB/ApiReference.md)
- [React Integration](./HyperDB/ReactIntegration.md)
- [Practical Examples](./HyperDB/Examples.md)
- [Expo Native Setup](./HyperDB/ExpoSetup.md)
- [Migration Guide](./HyperDB/MigrationGuide.md)
- [Peer Sync and Security](./HyperDB/PeerSyncSecurity.md)
- [Publishing and Versioning](./HyperDB/Publishing.md)
- [Troubleshooting](./HyperDB/Troubleshooting.md)

### Setup and modeling (Watermelon-compatible)

- [Enhanced Install & npm Publish](./EnhancedInstall.md)
- [Installation](./Installation.mdx)
- [Setup](./Setup.md)
- [Schema](./Schema.md)
- [Model](./Model.md)
- [Migrations](./Advanced/Migrations.md)

### Querying and reactivity

- [Relations](./Relation.md)
- [CRUD](./CRUD.md)
- [Components and observables](./Components.md)
- [Query patterns](./Query.md)
- [Reactive client reference](./Reactive.md)
- [Writers](./Writers.md)

### Sync

- [Sync intro](./Sync/Intro.md)
- [Frontend sync](./Sync/Frontend.md)
- [Peer-to-peer sync](./Sync/PeerToPeer.md)
- [Backend sync](./Sync/Backend.md)
- [Sync limitations](./Sync/Limitations.md)
- [Sync FAQ](./Sync/FAQ.md)
- [Sync troubleshooting](./Sync/Troubleshoot.md)

## Import path rules

In app code, use package entrypoints only:

- `@onchezz/hyperdb`
- `@onchezz/hyperdb/adapters/sqlite`
- `@onchezz/hyperdb/reactive/react`
- `@onchezz/hyperdb/sync`

Avoid importing package internals such as `src/...`.

## Common URL pitfall (`Page Not Found`)

HyperDB docs are hosted at:

- `https://onchezz.github.io/hyperDb/`

If you open:

- `https://onchezz.github.io/docs`

you will get a 404 because that path is outside this project pages base path.

## Primary docs URL

Use:

- [https://onchezz.github.io/hyperDb/](https://onchezz.github.io/hyperDb/)
