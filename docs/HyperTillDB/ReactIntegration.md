---
title: React Integration
---

# React Integration

HyperTillDB runtime APIs expose hooks directly on each model API, so components stay reactive without manual subscription effects.

## Basic hooks

### `db.<table>.useList(config?, deps?)`

```tsx
const { data, isLoading, error } = db.books.useList({
  orderBy: { column: 'created_at', ascending: false },
})
```

### `db.<table>.useById(id, deps?)`

```tsx
const { data: book, isLoading, error } = db.books.useById(bookId)
```

### Relation hooks

Relation fields generate hooks automatically (for example relation field `bookId` -> `useByBookId`).

```tsx
const { data: chapters } = db.chapters.useByBookId(bookId)
```

## Component pattern

1. Keep query config deterministic.
2. Use model APIs for writes (`db.books.update(...)`, `db.notes.create(...)`).
3. Keep screens declarative and state-light.
4. Render loading/error states from hook output.

## Generated hook layer

`hypertill generate` also emits `hypertill/generated/hooks.ts` wrappers:

```ts
import { useBooks, useBookById } from './hypertill/generated/hooks'

const books = useBooks(db)
const book = useBookById(db, bookId)
```

These wrappers keep naming consistent across modules and reduce repeated glue code.
