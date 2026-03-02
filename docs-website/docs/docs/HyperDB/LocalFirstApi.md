---
title: Local-First Query API
---

# Local-First Query API

HyperDB provides a Supabase-style chaining API for local tables.

## Create client

```ts
import { createReactiveClient } from '@onchezz/hyperdb'

const reactive = createReactiveClient(database)
```

## Start from table

```ts
reactive.from<Row>('tasks')
```

## Query builder operations

### Filters

- `eq(column, value)`
- `neq(column, value)`
- `gt/gte/lt/lte(column, value)`
- `in(column, values)`
- `match(recordSubset)`

### Shape and order

- `select(columns)`
- `order(column, { ascending })`
- `limit(count)`
- `range(from, to)`

### Read methods

- `fetch()`
- `single()`
- `maybeSingle()`
- `observe()`
- `subscribe(callback)`

### Write methods

- `insert(payload)`
- `update(partial)`
- `upsert(payload, options)`
- `delete()`

## Basic examples

### Fetch open tasks

```ts
const result = await reactive
  .from('tasks')
  .eq('is_done', false)
  .order('created_at', { ascending: false })
  .limit(100)
  .fetch()

if (result.error) {
  throw result.error
}

const tasks = result.data ?? []
```

### Update one row

```ts
const result = await reactive
  .from('tasks')
  .eq('id', taskId)
  .update({ is_done: true })
```

### Subscribe

```ts
const unsubscribe = reactive
  .from('tasks')
  .order('created_at', { ascending: false })
  .subscribe(({ data, error }) => {
    if (error) {
      console.error(error)
      return
    }

    console.log(data)
  })

// later
unsubscribe()
```

## Domain wrapper pattern

Preferred production pattern:

```ts
export const tasksService = {
  fetchOpen: () => reactive.from('tasks').eq('is_done', false).fetch(),
  create: (name: string) => reactive.from('tasks').insert({ name, is_done: false, created_at: Date.now() }),
  toggle: (id: string, isDone: boolean) => reactive.from('tasks').eq('id', id).update({ is_done: !isDone }),
}
```

Benefits:

- Consistent validation location
- Fewer DB details in UI
- Easier testing and migration

## Constraints and notes

- HyperDB remains local-first; remote semantics are app-defined.
- Query columns must exist in local schema.
- `upsert()` conflict handling is currently limited (see known limitations notes).
