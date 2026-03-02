# HyperDB

HyperDB is a **local-first reactive database layer** built on top of **WatermelonDB**.

It keeps WatermelonDB's storage/query performance model and adds:

1. Supabase-style local query chaining (`createReactiveClient`)
2. React-first reactive hooks (`useReactiveQuery`, `useReactiveSingle`, `ReactiveQuery`)
3. Peer-to-peer sync primitives for secure LAN/WebRTC/Bluetooth transport implementations

## Foundation and compatibility

HyperDB is not a replacement database engine.

- Storage + adapters: WatermelonDB (`SQLiteAdapter`, `LokiJSAdapter`)
- Query execution + observability: WatermelonDB
- Schema/model/migration semantics: WatermelonDB-compatible

If you already use WatermelonDB models and migrations, you can adopt HyperDB incrementally.

## Package identity

- Repository: `onchezz/hyperDb`
- Docs site: [https://onchezz.github.io/hyperDb/](https://onchezz.github.io/hyperDb/)
- Enhanced package (consumer target): `@onchezz/hyperdb`

## Quick install

### npm

```bash
npm install @onchezz/hyperdb
```

### Expo native (dev build)

```bash
npx expo run:android
# or
npx expo run:ios
```

Use native build workflow (not plain Expo Go) for SQLite-native integration.

## Core imports

```ts
import { Database, createReactiveClient } from '@onchezz/hyperdb'
import SQLiteAdapter from '@onchezz/hyperdb/adapters/sqlite'
import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'
import { createPeerSyncClient, startPeerSyncServer } from '@onchezz/hyperdb/sync'
```

## End-to-end example

### 1. Define schema

```ts
import { appSchema, tableSchema } from '@onchezz/hyperdb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'is_done', type: 'boolean' },
        { name: 'project_id', type: 'string', isIndexed: true },
        { name: 'position', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
})
```

### 2. Initialize DB

```ts
import { Database } from '@onchezz/hyperdb'
import SQLiteAdapter from '@onchezz/hyperdb/adapters/sqlite'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'hyper_db',
  jsi: true,
  onSetUpError: (error) => console.error(error),
})

export const database = new Database({
  adapter,
  modelClasses: [Task],
})
```

### 3. Create reactive client

```ts
import { createReactiveClient } from '@onchezz/hyperdb'

export const reactive = createReactiveClient(database)
```

### 4. Query and mutate with chain API

```ts
const list = await reactive
  .from('tasks')
  .eq('project_id', projectId)
  .order('position', { ascending: true })
  .fetch()

if (list.error) throw list.error

await reactive
  .from('tasks')
  .eq('id', taskId)
  .update({ is_done: true })
```

### 5. Make component reactive without manual `useEffect` subscription

```tsx
import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'

function TaskList({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading, error } = useReactiveQuery(
    () => reactive.from('tasks').eq('project_id', projectId).order('position', { ascending: true }),
    [projectId],
  )

  if (isLoading) return null
  if (error) return <Text>{error.message}</Text>

  return (
    <View>
      {(tasks ?? []).map((task) => (
        <Text key={task.id}>{task.name}</Text>
      ))}
    </View>
  )
}
```

## HyperDB API surface

### Query builder

- `from(table)`
- `select(columns)`
- `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `match`
- `order(column, { ascending })`
- `limit(count)`, `range(from, to)`

### Read methods

- `fetch()`
- `single()`
- `maybeSingle()`
- `observe()`
- `subscribe(cb)`

### Write methods

- `insert(payload)`
- `update(partial)`
- `upsert(payload, options)`
- `delete()`

Each operation returns a predictable envelope:

```ts
type ReactiveResponse<T> = {
  data: T | null
  error: Error | null
}
```

## Peer sync model

HyperDB exposes transport-agnostic helpers and expects app-provided transport + crypto.

Use this for secure same-network device sync flows (WebRTC, Bluetooth wrappers, LAN sockets), with:

1. Authenticated encryption codec (`encode`/`decode`)
2. Explicit peer authorization
3. Replay mitigation and schema validation

## Detailed docs

- HyperDB overview: [https://onchezz.github.io/hyperDb/HyperDB/Overview](https://onchezz.github.io/hyperDb/HyperDB/Overview)
- Architecture: [https://onchezz.github.io/hyperDb/HyperDB/Architecture](https://onchezz.github.io/hyperDb/HyperDB/Architecture)
- Local-first API: [https://onchezz.github.io/hyperDb/HyperDB/LocalFirstApi](https://onchezz.github.io/hyperDb/HyperDB/LocalFirstApi)
- React integration: [https://onchezz.github.io/hyperDb/HyperDB/ReactIntegration](https://onchezz.github.io/hyperDb/HyperDB/ReactIntegration)
- Expo setup: [https://onchezz.github.io/hyperDb/HyperDB/ExpoSetup](https://onchezz.github.io/hyperDb/HyperDB/ExpoSetup)
- Peer sync + security: [https://onchezz.github.io/hyperDb/HyperDB/PeerSyncSecurity](https://onchezz.github.io/hyperDb/HyperDB/PeerSyncSecurity)
- Publishing/versioning: [https://onchezz.github.io/hyperDb/HyperDB/Publishing](https://onchezz.github.io/hyperDb/HyperDB/Publishing)
- Troubleshooting + 404 analysis: [https://onchezz.github.io/hyperDb/HyperDB/Troubleshooting](https://onchezz.github.io/hyperDb/HyperDB/Troubleshooting)

## `Page Not Found` quick note

If you open `https://onchezz.github.io/docs`, you will get 404 for this project.

HyperDB docs are project pages under:

- `https://onchezz.github.io/hyperDb/`

## License and credits

HyperDB enhancement work is built on top of WatermelonDB.

WatermelonDB is MIT-licensed and authored/maintained by the Nozbe team and contributors.
See [`LICENSE`](./LICENSE).
