---
title: Expo Native Setup
---

# Expo Native Setup

HyperTillDB works in Expo native builds (development build / prebuild workflow).

## Requirements

- Node 18+
- Expo SDK aligned with React Native version
- Android Studio and/or Xcode

## Install

```bash
npm install @onchez/hypertilldb@0.0.1
```

## Native database bootstrap

```ts
import { core } from '@onchez/hypertilldb'
import SQLiteAdapter from '@onchez/hypertilldb/adapters/sqlite'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'hypertill_db',
  jsi: true,
  onSetUpError: console.error,
})

export const database = new core.Database({
  adapter,
  modelClasses: [BookModel, ChapterModel, NoteModel],
})
```

## Runtime setup

```ts
import { createDB, dbModel, defineModels, relation } from '@onchez/hypertilldb'

type Book = { title: string; authorId: string }
type Chapter = { title: string; bookId: string; position: number }
type Note = { chapterId: string; body: string }

const models = defineModels({
  Book: dbModel<Book>(),
  Chapter: dbModel<Chapter>(relation.Book('book_id')),
  Note: dbModel<Note>(relation.Chapter('chapter_id')),
})

export const db = createDB({
  name: 'hypertill_expo',
  database,
  models,
})
```

## Build commands

```bash
npx expo prebuild
npx expo run:android
# or
npx expo run:ios
```

## Adapter matrix

- iOS/Android native: `@onchez/hypertilldb/adapters/sqlite`
- Expo web / browser: `@onchez/hypertilldb/adapters/lokijs`

Do not use SQLite adapter on web builds.

## Import rules

Use package entrypoints only:

- `@onchez/hypertilldb`
- `@onchez/hypertilldb/adapters/sqlite`
- `@onchez/hypertilldb/adapters/lokijs`
- `@onchez/hypertilldb/reactive/react`

Do not import `src/...` internals.
