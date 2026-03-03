---
title: Migration Guide (WatermelonDB -> HyperTillDB)
---

# Migration Guide (WatermelonDB -> HyperTillDB)

This guide covers migration in two phases:

1. adopt HyperTillDB package identity
2. move to the main type-first API

## Phase 1: adopt package and runtime client

### 1) Install

```bash
npm install @onchez/hypertilldb@0.0.1
```

### 2) Update imports

```diff
- import { Database } from '@nozbe/watermelondb'
- import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
+ import { Database } from '@onchez/hypertilldb'
+ import SQLiteAdapter from '@onchez/hypertilldb/adapters/sqlite'
```

Runtime API:

```diff
- import { createReactiveClient } from '@nozbe/watermelondb'
+ import { createDB, dbModel, defineModels, relation } from '@onchez/hypertilldb'
```

React wrappers:

```diff
- import { useReactiveQuery } from '@nozbe/watermelondb/reactive/react'
+ import { useReactiveQuery } from '@onchez/hypertilldb/reactive/react'
```

### 3) Keep DB bootstrap

```ts
const adapter = new SQLiteAdapter({ schema, dbName: 'app_db', jsi: true })

export const database = new Database({
  adapter,
  modelClasses: [Book, Chapter, Note],
})
```

### 4) Use generated no-`useEffect` hooks

Before:

```tsx
useEffect(() => {
  const unsubscribe = reactive.from('chapters').eq('book_id', bookId).subscribe(setStateFromResponse)
  return unsubscribe
}, [bookId])
```

After:

```tsx
const { data, error, isLoading } = db.chapters.useByBookId(bookId)
```

## Phase 2: move to model-first generation (vNext)

### 1) Define TypeScript models + register models

```ts
type Author = { name: string }
type Book = { title: string; authorId: string }

const models = defineModels({
  Author: dbModel<Author>(),
  Book: dbModel<Book>(relation.Author('author_id')),
})
```

### 2) Initialize DB client

```ts
const db = createDB({
  name: 'app',
  database,
  models,
})
```

### 3) Replace handwritten runtime wiring gradually

Recommended:

1. keep old schema active
2. switch query/mutation calls to `db.use*` and `db.<table>.*`
3. move feature modules one at a time
4. retire duplicated wrappers

## Migration risks

1. Mixed package scopes in one app.
2. Importing old internals from `src/...`.
3. Treating every column addition as destructive migration.
4. Sync assumptions that rely on full-table updates.

## Success criteria

- app behavior unchanged for existing users
- reactive UI paths simplified
- schema/model/migration updates are deterministic
- sync updates only changed rows/fields
