---
title: Model-First Schema and Generation
---

# Model-First Schema and Generation

This page defines the HyperTillDB vNext model-first design.

## Problem

In many WatermelonDB apps, developers maintain these files manually:

- schema definitions
- model classes/decorators
- TypeScript row types
- migrations
- reactive hooks

That duplication causes drift and migration mistakes.

## vNext goal

One TypeScript model definition becomes the source of truth.

## Proposed DSL

```ts
import { defineModel, string, number, boolean, relation, json } from '@onchez/hypertilldb'

export const Book = defineModel('books', {
  title: string(),
  author: string().optional(),
  publishedAt: number().optional().indexed(),
  tags: json().default([]),
  isArchived: boolean().default(false),
})

export const Chapter = defineModel('chapters', {
  bookId: relation('books').indexed(),
  title: string(),
  position: number(),
})

export const Note = defineModel('notes', {
  chapterId: relation('chapters').indexed(),
  content: string(),
  createdAt: number(),
})
```

## Generated artifacts

Running generation command should emit:

1. `hypertill/generated/schema.ts`
2. `hypertill/generated/models/*.ts`
3. `hypertill/generated/types.ts`
4. `hypertill/generated/hooks.ts`
5. `hypertill/generated/migrations/<timestamp>.ts` when model diff exists
6. `hypertill/generated/model-snapshot.json`

## Command

```bash
hypertill generate
```

## Migration generation rules

### Auto-safe

- new table
- new nullable column
- new column with safe default
- new index on existing column

### Needs explicit mapping

- column rename
- table rename
- column delete
- type narrowing change

For explicit mappings, provide `hypertill/hypertill.migration-map.ts` (or `.js`).

## Field mapping rules

Recommended default mapping:

- `string` -> Watermelon `string`
- `number` -> Watermelon `number`
- `boolean` -> Watermelon `boolean`
- `json<T>` -> Watermelon `string` + serializer wrapper
- `relation('table')` -> indexed foreign key string column (`<name>_id` or explicit)

## Hook generation rules

For each model `Book`, generate:

- `useBooks(queryOptions?)`
- `useBookById(id)`
- `useCreateBook()`
- `useUpdateBook()`
- `useDeleteBook()`

For relations:

- `useChaptersByBook(bookId)`
- `useNotesByChapter(chapterId)`

## Web/mobile compatibility

Generator output should avoid platform-specific code in model definitions.

Platform specifics belong in adapter/bootstrap files only.

## Implementation notes

Recommended internal implementation strategy:

1. Load model module (`hypertill/models.ts` by default).
2. Build normalized deterministic snapshot.
3. Diff against previous `generated/model-snapshot.json`.
4. Emit deterministic generated files.
5. Fail fast on destructive diffs unless explicitly mapped.

## CI policy

In CI:

1. run `npx hypertill generate`
2. fail build if generated files changed unexpectedly
3. require migrations in same PR as model changes

## Research references

- ts-morph project API: [ts-morph.com](https://ts-morph.com/)
- Drizzle migration generation patterns: [orm.drizzle.team/docs/migrations](https://orm.drizzle.team/docs/migrations)
