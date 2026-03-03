---
title: Dependent Model Graphs
---

# Dependent Model Graphs

This page defines how HyperTillDB should model parent/child dependencies safely and performantly.

## Canonical example

- `authors` has many `books`
- `books` has many `chapters`
- `chapters` has many `notes`

```text
authors (1) -> (N) books (1) -> (N) chapters (1) -> (N) notes
```

## Many-to-many case

If a chapter can belong to many books, use a join table:

- `book_chapters`
  - `book_id`
  - `chapter_id`
  - optional metadata (`position`, `added_at`)

```text
books (1) -> (N) book_chapters (N) <- (1) chapters
```

Do not overload a single foreign key for many-to-many.

## Model-first DSL proposal

```ts
export const Author = defineModel('authors', {
  name: string(),
})

export const Book = defineModel('books', {
  authorId: relation('authors').indexed(),
  title: string(),
})

export const Chapter = defineModel('chapters', {
  bookId: relation('books').indexed(),
  title: string(),
  position: number(),
})

export const Note = defineModel('notes', {
  chapterId: relation('chapters').indexed(),
  content: string(),
})
```

## Transactional create flow

When creating dependent trees, write in parent-first order in one write transaction:

1. create author
2. create book with `author_id`
3. create chapter(s) with `book_id`
4. create note(s) with `chapter_id`

This guarantees referential consistency in local state and sync oplog ordering.

## Deletion strategy

Recommended default:

- soft delete (`deleted_at`) for sync safety
- explicit cascade policy in services, not implicit hard deletes

Example policies:

- deleting author archives books
- deleting book archives chapters and notes
- deleting chapter archives notes only

## Generated hooks for dependencies

Generated hook layer should include relation-aware hooks:

- `useBooksByAuthor(authorId)`
- `useChaptersByBook(bookId)`
- `useNotesByChapter(chapterId)`

For many-to-many:

- `useChaptersByBook(bookId)` via join-table query

## Migration ordering for dependent graphs

Migration generator should apply changes in topological order:

1. parent tables
2. child tables
3. join tables
4. indexes

For destructive changes, require explicit mapping and data migration script.

## Watermelon compatibility note

HyperTillDB dependency modeling remains compatible with Watermelon associations/model patterns.

Reference: [watermelondb.dev/docs/Model](https://watermelondb.dev/docs/Model)
