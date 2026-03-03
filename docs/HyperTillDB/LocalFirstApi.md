---
title: Local-First Query API
---

# Local-First Query API

HyperTillDB exposes a model-aware runtime API via `createDB`.

## Create client

```ts
import { createDB } from '@onchez/hypertilldb'

const db = createDB({ name: 'app', database, models })
```

`db` includes one API object per table (`db.books`, `db.chapters`, ...).

## Operations

### Reads

- `fetch(config?)`
- `query(config?)`
- `subscribe(config, listener)`

### Writes

- `create(payload)`
- `createMany(payload[])`
- `update(id, patch)`
- `patch(where, patch)`
- `delete(id)`
- `remove(where)`
- `upsert(payload, options?)`

### Reactive hooks

- `db.useBooks(config?, deps?)`
- `db.useBookById(id, deps?)`
- relation hooks generated from relations (for example `db.useChaptersByBookId(bookId)`)

## Query config

```ts
type QueryConfig = {
  select?: string[] | string
  where?: Record<string, unknown>
  orderBy?: { column: string; ascending?: boolean } | string
  limit?: number
  range?: [number, number]
}
```

## Example: list chapters for one book

```ts
const chapters = await db.chapters.fetch({
  where: { book_id: bookId },
  orderBy: { column: 'position', ascending: true },
})
```

## Example: update one book title

```ts
const result = await db.books.update(bookId, { title: nextTitle })
if (result.error) {
  throw result.error
}
```

## Example: reactive component

```tsx
const { data, error, isLoading } = db.useChaptersByBookId(bookId)
```

## Notes

- HyperTillDB remains local-first. Remote sync is a separate layer.
- Explicit relation columns are still used in storage (`book_id`, `chapter_id`, etc.).
