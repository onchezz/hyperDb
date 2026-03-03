---
title: HyperTillDB Overview
---

# HyperTillDB Overview

HyperTillDB is a local-first developer layer built on top of WatermelonDB.

It keeps WatermelonDB where performance matters and adds tooling where developer productivity matters.

## Core idea

Use one model definition as the source of truth and generate:

- table schema
- model classes
- row types
- reactive hooks
- migration steps

Then run a sync engine that exchanges only deltas and supports peer relay when offline.

## Product goals

1. Keep local operations fast and reactive.
2. Remove repetitive setup and migration boilerplate.
3. Make sync explicit, observable, and conflict-aware.
4. Work on mobile and web with one API shape.
5. Keep strong safety defaults for security and auth.

## What HyperTillDB inherits from WatermelonDB

- SQLite/Loki adapter model
- query engine and observables
- writer semantics and deletion model
- sync-safe raw record lifecycle

## What HyperTillDB adds

- type-first model registry: `dbModel`, `defineModels`, `relation`
- runtime client builder: `createDB`
- root-level hooks: `db.useBooks(...)`, `db.useBooksByAuthorId(...)`
- simple mutation result contract: `{ data, error, loading, status, progress }`
- web-safe adapter guards for SQLite and clear web adapter guidance

## Main API

### Current API

```ts
import {
  createDB,
  dbModel,
  defineModels,
  relation,
} from '@onchez/hypertilldb'
```

```ts
const models = defineModels({
  Author: dbModel<Author>(),
  Book: dbModel<Book>(relation.Author('author_id')),
})
```

### Runtime API

```ts
const db = createDB({ name: 'books-app', database, models })
const books = await db.books.fetch({ where: { author_id: authorId } })
const state = db.useBooksByAuthorId(authorId)
```

## Relation modeling note

In HyperTillDB docs, examples use explicit domain relations such as:

- `book_id` on chapters
- `chapter_id` on notes

## Next reads

- [Architecture](./Architecture.md)
- [Dependent Model Graphs](./DependentModels.md)
- [Model-First Schema and Generation](./ModelFirstSchema.md)
- [IDs and Metadata](./IdStrategy.md)
- [Local-First Query API](./LocalFirstApi.md)
- [Backend Adapters and Types](./BackendAdapters.md)
- [Sync Engine](./SyncEngine.md)
- [Search and Performance](./SearchPerformance.md)
- [Testing Strategy](./TestingStrategy.md)
