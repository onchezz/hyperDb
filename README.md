# HyperTillDB

Type-first, local-first database toolkit built on Watermelon internals for Expo, React Native, and Web.

## Status

This README documents the main HyperTillDB API.

Implemented now:

1. type-first model registry (`dbModel`, `defineModels`, `createDB`)
2. reactive hooks without manual subscription setup
3. simple mutation response shape with progress metadata
4. soft/hard delete modes per model
5. `dbModel<T>()` type metadata extraction via Babel plugin (`@onchez/hypertilldb/babel-plugin`)
6. smart migration planning for additive/rename-safe changes with destructive-change blocking
7. string search with selectable columns (`search`, `columns`, `mode`)
8. chunked `createMany` with internal defaults (override optional)

Planned next:

1. full type-checker-backed extraction for advanced cross-file TS patterns
2. sync engine and backend connector packs

## Install

```bash
npm install @onchez/hypertilldb
```

## Core goals

1. Define app types once and reuse them for DB access.
2. Keep mutations simple and predictable.
3. Support high-throughput writes (POS/ecommerce scale).
4. Keep relations reactive and consistent.
5. Support per-model delete strategy (soft/hard/cascade).

## Quick start (Books app)

```ts
// src/db/models.ts
export type Author = {
  name: string
  address?: string
  phone?: number
}

export type BookStatus = 'draft' | 'published' | 'archived'

export type Meta = {
  isbn?: string
  code: number
}

export type Book = {
  title: string
  authorId: string
  status: BookStatus
  tags?: string[]
  meta?: Meta
  publishedAt?: number
}

export type Chapter = {
  bookId: string
  title: string
  position: number
}

export type Note = {
  chapterId: string
  body: string
}
```

```ts
// src/db/index.ts
import { createDB, dbModel, defineModels, relation } from '@onchez/hypertilldb'
import type { Author, Book, Chapter, Note } from './models'

export const models = defineModels(
  {
    Author: dbModel<Author>(),
    Book: dbModel<Book>(relation.Author('authorId')),
    Chapter: dbModel<Chapter>(relation.Book('bookId')),
    Note: dbModel<Note>(relation.Chapter('chapterId')),
  },
)

export const db = createDB({
  name: 'books-app',
  models,
})
```

### Enable the Babel type-metadata plugin

Add this plugin in `babel.config.js` so `dbModel<Type>()` gets runtime metadata automatically:

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@onchez/hypertilldb/babel-plugin'],
  }
}
```

Without this plugin (or without `defineModel(...)`), `createDB()` needs an explicit `database`.

## Reactive queries

```ts
const { data: books, error, isLoading } = db.useBooks({
  where: { authorId },
  orderBy: { title: 'asc' },
})

const { data: chapters } = db.useChapters({
  where: { bookId },
  orderBy: { column: 'position', ascending: true },
})

const { data: notes } = db.useNotesByChapterId(chapterId)

const { data: searchedBooks } = db.useBookSearch({
  search: 'deep',
  columns: ['title', 'status'],
  where: { authorId },
  orderBy: { title: 'asc' },
})
```

Auto relation helpers:

- `db.useBooksByAuthorId(authorId)`
- `db.useChaptersByBookId(bookId)`
- `db.useNotesByChapterId(chapterId)`

## Simple mutation contract

All mutations return one consistent shape:

```ts
type MutationResult<T> = {
  data: T | null
  error: Error | null
  loading: false
  status: 'success' | 'partial_success' | 'error'
  progress: {
    total: number
    current: number
    processed: number
    written: number
    failed: number
    percent: number
    chunk: number
    chunksTotal: number
  }
}
```

Single write:

```ts
const { data, error, loading, status, progress } =
  await db.books.create({ title: 'Deep Work', authorId, status: 'draft' })

await db.books.update(bookId, { status: 'published' })
```

Bulk write:

```ts
const { data, error, status, progress } = await db.books.createMany(rows)
// Uses internal default chunking. Dev can override only if needed.

const withCustomChunk = await db.books.createMany(rows, {
  chunkSize: 500,
  onProgress: (p) => console.log(p.written, p.percent, p.chunk, p.chunksTotal),
})
```

## Large write performance (10,000+ rows)

HyperTillDB handles bulk writes internally with:

1. single-writer queue
2. chunked transactions
3. prepared statement reuse
4. coalesced reactive invalidation
5. summary result payloads instead of returning huge row arrays

## Delete behavior (per model)

```ts
export const models = defineModels({
  Author: dbModel<Author>({ deleteMode: 'soft' }),
  Book: dbModel<Book>({ deleteMode: 'soft' }),
  Chapter: dbModel<Chapter>({ deleteMode: 'hard' }),
  Note: dbModel<Note>({ deleteMode: 'hard' }),
})
```

Per call override:

```ts
await db.books.delete(bookId, { mode: 'hard' })
```

## Automatic system fields

Injected automatically for all models:

- `id: string`
- `created_at: number`
- `updated_at: number`
- optional `deleted_at` when soft delete is enabled

You do not re-declare these in your app types.

## Type mapping

- `string` -> string column
- `number` -> number column
- `boolean` -> boolean column
- `T[]` -> JSON column
- object types -> JSON column
- union string enums -> string column + runtime enum validation
- optional fields (`?`) -> nullable

camelCase fields map to snake_case storage columns.

## Migrations and sync

Migration planning is now available:

```ts
const db = createDB({
  name: 'books-app',
  models,
  migration: {
    mode: 'smart',
    previousSnapshot,
    detectRename: 'same-type-one-to-one',
  },
})
```

Available migration metadata:

- `db.migration` (diff/plan/report)
- `db.snapshot` (save and pass back as `previousSnapshot` on next launch)

Sync engine and backend connector packs are still in progress.

## Events

`db.events` is available for app-level instrumentation (`emit`, `on`, `off`, `clear`).

## Platform adapters

- Native/Expo native: SQLite adapter path
- Web: LokiJS adapter path

## Core namespace

Low-level Watermelon-compatible internals remain available:

```ts
import { core } from '@onchez/hypertilldb'
```

Use this only for advanced/custom infrastructure needs.

## Documentation and planning

Detailed technical plan:

- `HYPERTILLDB_TYPE_FIRST_PLAN.md`
- `HYPERTILLDB_CHANGE_TRACKER.md`

Local docs scripts:

```bash
npm run docs:dev
npm run docs:build
npm run docs:deploy
```

Quality check command:

```bash
npm run test:all
```
