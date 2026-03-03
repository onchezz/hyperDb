---
title: HyperTillDB Practical Examples
---

# HyperTillDB Practical Examples

This page uses a books/chapters/notes domain.

## Example 1: models + runtime setup

```ts
import {
  createDB,
  dbModel,
  defineModels,
  relation,
} from '@onchez/hypertilldb'

type Book = { title: string }
type Chapter = { bookId: string; title: string; position: number }

const models = defineModels({
  Book: dbModel<Book>(),
  Chapter: dbModel<Chapter>(relation.Book('book_id')),
})

export const db = createDB({
  name: 'books-app',
  database,
  models,
})
```

## Example 2: list + mutate

```ts
const result = await db.chapters.fetch({
  where: { book_id: bookId },
  orderBy: { column: 'position', ascending: true },
})

await db.chapters.create({
  book_id: bookId,
  title: 'New chapter',
  position: 3,
})
```

## Example 3: reactive UI without manual subscribe effect

```tsx
function ChapterList({ bookId }) {
  const { data, isLoading, error } = db.useChaptersByBookId(bookId)

  if (isLoading) return null
  if (error) return <Text>{error.message}</Text>

  return (data ?? []).map((chapter) => <Text key={chapter.id}>{chapter.title}</Text>)
}
```

## Example 4: deterministic generation

```bash
hypertill generate
```

Output appears under `hypertill/generated/`.

## Example 5: strict destructive migration flow

If you rename a column and generator fails, add explicit map:

```ts
export default {
  renameColumns: {
    books: {
      title: 'name',
    },
  },
}
```

Then rerun `hypertill generate`.

## Anti-patterns to avoid

1. Using SQLite adapter on web.
2. Importing package internals from `src/...`.
3. Spreading write logic across random UI components.
4. Relying on full-row replacements when patch updates are sufficient.
