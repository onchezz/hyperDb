---
title: Reactive Client
hide_title: true
---

# HyperDB reactive client API (`createReactiveClient`)

HyperDB exposes a Supabase-style query API for local tables.

It is built on top of Watermelon collections/queries and returns:

- `Promise` responses for one-off reads and writes
- observable/subscribe APIs for live updates
- predictable `{ data, error }` response envelopes

```ts
import { createReactiveClient } from '@onchezz/hyperdb'

const reactive = createReactiveClient(database)
```

---

## Query builder

Start with `.from(table)` and chain filters:

```ts
const query = reactive
  .from('tasks')
  .eq('project_id', projectId)
  .order('position')
  .limit(50)
```

Supported clauses:

- `select(columns?: string | string[])`
- `eq`, `neq`
- `gt`, `gte`, `lt`, `lte`
- `in`
- `match`
- `order(column, { ascending?: boolean })`
- `limit(count)`
- `range(from, to)`

### Read methods

- `fetch()` -> rows array
- `single()` -> exactly one row (error otherwise)
- `maybeSingle()` -> zero or one row (error if more than one)
- `observe()` -> Rx stream of `{ data, error }`
- `subscribe(callback)` -> lightweight callback subscription

All return `ReactiveResponse<T>`:

```ts
type ReactiveResponse<T> = {
  data: T | null
  error: Error | null
}
```

---

## Mutation methods

Reactive query objects also support writes:

- `insert(row | row[])`
- `update(partialRow)` (updates all rows matched by current filters)
- `delete()` (marks matched rows as deleted, sync-compatible)
- `upsert(row | row[], { onConflict })` (`onConflict: 'id'` supported)

Example:

```ts
await reactive.from('tasks').insert({
  name: 'Ship release',
  is_done: false,
  created_at: Date.now(),
})

await reactive.from('tasks').eq('id', taskId).update({ is_done: true })
```

---

## React hooks

To keep components simple, use:

- `useReactiveQuery`
- `useReactiveSingle`
- `ReactiveQuery`

```tsx
import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'

function TaskList({ projectId }) {
  const { data, error, isLoading } = useReactiveQuery(
    () =>
      reactive
        .from('tasks')
        .eq('project_id', projectId)
        .order('position'),
    [projectId],
  )

  if (isLoading) return <Text>Loading...</Text>
  if (error) return <Text>{error.message}</Text>

  return data?.map((task) => <TaskRow key={task.id} task={task} />) ?? null
}
```

This removes manual subscription boilerplate from screen components.

---

## TypeScript pattern

Define row types per table:

```ts
type TaskRow = {
  id?: string
  project_id: string
  name: string
  is_done: boolean
  created_at: number
}
```

Then pass generics to `.from<T>()`:

```ts
const { data } = await reactive.from<TaskRow>('tasks').eq('project_id', id).fetch()
```

---

## Behavior notes

- This API is local-first: it reads/writes Watermelon local DB.
- `delete()` uses Watermelon deletion semantics (`markAsDeleted`), which is sync-safe.
- Immutable columns (`id`, `_status`, `_changed`) cannot be patched via `update()`.
- `upsert()` currently supports conflict handling by `id`.
- Use secure sync separately (HTTP sync or peer sync) to exchange data between devices.

For transport-level device-to-device replication, see [Peer-to-peer sync](./Sync/PeerToPeer.md).
