---
title: HyperTillDB API Reference
---

# HyperTillDB API Reference

This page documents the main package API.

## Top-level exports

```ts
import {
  createDB,
  dbModel,
  defineModels,
  relation,
} from '@onchez/hypertilldb'
```

Low-level compatibility APIs also remain available:

```ts
import { defineModel, string, number, boolean, json, createHyperTill, core } from '@onchez/hypertilldb'
```

## Type-first model registry

```ts
type Author = { name: string; phone?: number }
type Book = { title: string; authorId: string }

const models = defineModels({
  Author: dbModel<Author>(),
  Book: dbModel<Book>(relation.Author('author_id')),
})

const db = createDB({
  name: 'books-app',
  database,
  models,
})
```

`db` exposes:

- root hooks (`db.useBooks`, `db.useBookById`, relation helpers)
- model APIs (`db.books`, `db.authors`, ...)
- `db.events` event emitter (`emit`, `on`, `off`, `clear`)

### Model API methods

```ts
const list = await db.books.fetch({
  where: { author_id: authorId },
  orderBy: { column: 'title', ascending: true },
})

const created = await db.books.create({ title: 'Book A', author_id: authorId })
await db.books.update(created.data.id, { title: 'Book B' })
await db.books.delete(created.data.id, { mode: 'soft' })
```

### Mutation result

```ts
type MutationResult<T> = {
  data: T | null
  error: Error | null
  loading: false
  status: 'success' | 'error'
  progress: { current: number; total: number; percent: number }
}
```

### Reactive hooks without manual subscription wiring

```tsx
const { data: books } = db.useBooks({ where: { author_id: authorId } })
const { data: book } = db.useBookById(bookId)
const { data: booksByAuthor } = db.useBooksByAuthorId(authorId)
```

## Core compatibility namespace

`core` exposes Watermelon-compatible low-level primitives:

- `core.Database`
- `core.appSchema`
- `core.tableSchema`
- `core.createReactiveClient`
- `core.uuidv4`
