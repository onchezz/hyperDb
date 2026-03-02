---
title: HyperDB API Reference
---

# HyperDB API Reference

This page documents the HyperDB local-first API that sits on top of WatermelonDB.

## Client creation

```ts
import { createReactiveClient } from '@onchezz/hyperdb'

const reactive = createReactiveClient(database)
```

## Core response contract

```ts
type ReactiveResponse<T> = {
  data: T | null
  error: Error | null
}
```

All query and mutation methods resolve to this envelope.

## Entry point

### `reactive.from<Row>(table: string)`

Creates a chainable table query.

```ts
const tasks = reactive.from<TaskRow>('tasks')
```

## Query composition methods

### `select(columns?: string | string[])`

Selects projected columns. Omit for full row shape.

```ts
reactive.from('tasks').select(['id', 'name'])
```

### `eq(column, value)` / `neq(column, value)`

Equality or inequality filters.

```ts
reactive.from('tasks').eq('project_id', projectId)
```

### `gt/gte/lt/lte(column, value)`

Numeric/date comparison filters.

```ts
reactive.from('tasks').gte('created_at', sinceTs)
```

### `in(column, values)`

Column value in array.

```ts
reactive.from('tasks').in('id', ids)
```

### `match(recordSubset)`

Multi-field equality shorthand.

```ts
reactive.from('tasks').match({ project_id: projectId, is_done: false })
```

### `order(column, options?)`

Sort rows by column.

```ts
reactive.from('tasks').order('position', { ascending: true })
```

### `limit(count)`

Restricts returned row count.

```ts
reactive.from('tasks').limit(50)
```

### `range(from, to)`

Applies an inclusive index range.

```ts
reactive.from('tasks').order('position').range(0, 19)
```

## Read methods

### `fetch()`

Fetches array results.

```ts
const result = await reactive.from('tasks').eq('project_id', projectId).fetch()
```

### `single()`

Expects exactly one row. Returns error when none or many.

```ts
const one = await reactive.from('tasks').eq('id', taskId).single()
```

### `maybeSingle()`

Expects zero or one row. Returns error only when many rows match.

```ts
const maybe = await reactive.from('tasks').eq('id', taskId).maybeSingle()
```

### `observe()`

Returns observable stream of `ReactiveResponse<T>`.

```ts
const sub = reactive
  .from('tasks')
  .eq('project_id', projectId)
  .observe()
  .subscribe(({ data, error }) => {
    if (error) console.error(error)
    else console.log(data)
  })

sub.unsubscribe()
```

### `subscribe(callback)`

Convenience subscription helper that returns `unsubscribe` function.

```ts
const unsubscribe = reactive
  .from('tasks')
  .eq('project_id', projectId)
  .subscribe(({ data, error }) => {
    if (error) return
    setTasks(data ?? [])
  })

unsubscribe()
```

## Write methods

### `insert(payload | payload[])`

Creates records.

```ts
await reactive.from('tasks').insert({
  name: 'Draft release notes',
  project_id: projectId,
  is_done: false,
  position: 1,
  created_at: Date.now(),
})
```

### `update(partial)`

Updates matched records. Use filters before update.

```ts
await reactive.from('tasks').eq('id', taskId).update({ is_done: true })
```

### `upsert(payload, options?)`

Insert-or-update helper (currently conflict by `id` is the standard path).

```ts
await reactive.from('tasks').upsert({ id: taskId, name: 'Updated title' }, { onConflict: 'id' })
```

### `delete()`

Deletes matched records using Watermelon-compatible deletion semantics.

```ts
await reactive.from('tasks').eq('id', taskId).delete()
```

## React helpers

Import from `@onchezz/hyperdb/reactive/react`.

### `useReactiveQuery(buildQuery, deps?)`

Reactive list/collection reads.

```tsx
const state = useReactiveQuery(() => reactive.from('tasks').eq('project_id', projectId), [projectId])
```

### `useReactiveSingle(buildQuery, deps?)`

Reactive single-row reads.

```tsx
const state = useReactiveSingle(() => reactive.from('tasks').eq('id', taskId), [taskId])
```

### `ReactiveQuery`

Render helper for data/loading/error states when hooks are inconvenient.

## TypeScript patterns

```ts
type TaskRow = {
  id?: string
  name: string
  project_id: string
  is_done: boolean
  position: number
  created_at: number
}

const result = await reactive.from<TaskRow>('tasks').eq('project_id', projectId).fetch()
```

## Constraints

- HyperDB is local-first; no remote table reflection is implied.
- Columns used in filters must exist in local schema.
- Performance depends on query shape and indexing.
- For cross-device sync, pair HyperDB with explicit sync transport flow.
