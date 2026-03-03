import { renderHook } from '@testing-library/react-hooks'

import { mockDatabase } from '../__tests__/testModels'
import { defineModel, string, number, boolean, relation as schemaRelation } from '../modeling'
import { createDB } from './createDB'
import { createSchemaSnapshot } from './migrations'
import { dbModel, defineModels } from './defineModels'
import { relation } from './relation'

describe('typeFirst', () => {
  let database
  let tasks

  beforeEach(() => {
    ;({ database, tasks } = mockDatabase())
  })

  const baseSystemColumns = [
    { name: 'created_at', type: 'number', isIndexed: true, isOptional: false },
    { name: 'updated_at', type: 'number', isIndexed: true, isOptional: false },
    { name: 'deleted_at', type: 'number', isIndexed: true, isOptional: true },
  ]

  it('builds model registry with relation metadata', () => {
    const models = defineModels({
      Task: dbModel({ table: 'mock_tasks', timestamps: false }),
      Comment: dbModel(relation.Task('task_id'), { table: 'mock_comments' }),
    })

    expect(models.entries.map((entry) => entry.table)).toEqual(['mock_comments', 'mock_tasks'])
    expect(models.byName.Comment.relations).toHaveLength(1)
    expect(models.byName.Comment.relations[0].foreignKey).toBe('task_id')
    expect(models.byName.Comment.relations[0].targetTable).toBe('mock_tasks')
  })

  it('creates a simple db client with mutation status and relation hooks', async () => {
    const models = defineModels({
      Task: dbModel({ table: 'mock_tasks', timestamps: false }),
      Comment: dbModel(relation.Task('task_id'), { table: 'mock_comments' }),
    })

    const db = createDB({
      name: 'unit-test',
      database,
      models,
    })

    let taskId
    await database.write(async () => {
      const task = await tasks.create((record) => {
        record.name = 'T1'
        record.position = 1
        record.isCompleted = false
        record.projectId = 'project-1'
      })
      taskId = task.id
    })

    const created = await db.mock_comments.create({
      task_id: taskId,
      body: 'hello',
    })

    expect(created.error).toBe(null)
    expect(created.status).toBe('success')
    expect(created.loading).toBe(false)
    expect(created.progress.percent).toBe(100)
    expect(typeof created.data?.created_at).toBe('number')
    expect(typeof created.data?.updated_at).toBe('number')

    expect(typeof db.useComments).toBe('function')
    expect(typeof db.useCommentsByTaskId).toBe('function')

    const listHook = renderHook(() => db.useCommentsByTaskId(taskId))
    expect(listHook.result.current.error).toBe(null)
    expect(Array.isArray(listHook.result.current.data) || listHook.result.current.isLoading).toBe(true)
  })

  it('auto-bootstraps from schema-first models when database is omitted', async () => {
    const TaskModel = defineModel('tasks', {
      name: string(),
      is_done: boolean(),
      priority: number().optional(),
    })

    const db = createDB({
      name: 'schema-first',
      models: [TaskModel],
      platform: 'web',
    })

    const created = await db.tasks.create({
      name: 'A',
      is_done: false,
    })

    expect(created.error).toBe(null)
    expect(created.data).toBeTruthy()
    expect(typeof created.data?.id).toBe('string')
    expect(typeof created.data?.created_at).toBe('number')
    expect(typeof created.data?.updated_at).toBe('number')
    expect(db.database).toBeTruthy()
    expect(db.schema).toBeTruthy()

    const listed = await db.tasks.fetch({
      where: { is_done: false },
      limit: 5,
    })

    expect(listed.error).toBe(null)
    expect((listed.data || []).length).toBe(1)
  })

  it('auto-bootstrapped schema models expose root hooks and update timestamps correctly', async () => {
    const TaskModel = defineModel('tasks', {
      name: string(),
      is_done: boolean(),
    })

    const db = createDB({
      name: 'schema-hooks',
      models: [TaskModel],
      platform: 'web',
    })

    const created = await db.tasks.create({
      name: 'Hook test',
      is_done: false,
    })
    const createdRow = created.data
    expect(created.error).toBe(null)
    expect(typeof db.useTasks).toBe('function')
    expect(typeof db.useTaskById).toBe('function')
    expect(createdRow?.id).toBeTruthy()
    expect(typeof createdRow?.updated_at).toBe('number')

    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = await db.tasks.update(String(createdRow?.id), { is_done: true })
    expect(updated.error).toBe(null)
    expect(updated.data?.created_at).toBe(createdRow?.created_at)
    expect(Number(updated.data?.updated_at)).toBeGreaterThanOrEqual(Number(createdRow?.updated_at))

    const hook = renderHook(() => db.useTaskById(String(createdRow?.id)))
    expect(hook.result.current.error).toBe(null)
  })

  it('returns deterministic progress metadata for createMany in schema-first mode', async () => {
    const TaskModel = defineModel('tasks', {
      name: string(),
      is_done: boolean(),
    })

    const db = createDB({
      name: 'schema-progress',
      models: [TaskModel],
      platform: 'web',
    })

    const result = await db.tasks.createMany([
      { name: 'A', is_done: false },
      { name: 'B', is_done: false },
      { name: 'C', is_done: true },
    ])

    expect(result.error).toBe(null)
    expect(result.status).toBe('success')
    expect(result.progress.total).toBe(3)
    expect(result.progress.current).toBe(3)
    expect(result.progress.percent).toBe(100)
    expect((result.data || []).length).toBe(3)
  })

  it('exposes relation hooks for schema-first relation fields', async () => {
    const BookModel = defineModel('books', {
      title: string(),
    })
    const ChapterModel = defineModel('chapters', {
      book_id: schemaRelation('books').indexed(),
      title: string(),
      position: number(),
    })

    const db = createDB({
      name: 'schema-relations',
      models: [BookModel, ChapterModel],
      platform: 'web',
    })

    const createdBook = await db.books.create({
      title: 'Deep Work',
    })
    const bookId = createdBook.data?.id
    expect(typeof bookId).toBe('string')

    await db.chapters.create({
      book_id: String(bookId),
      title: 'Intro',
      position: 1,
    })

    expect(typeof db.useChaptersByBookId).toBe('function')
    const hook = renderHook(() => db.useChaptersByBookId(String(bookId)))
    expect(hook.result.current.error).toBe(null)
    expect(Array.isArray(hook.result.current.data) || hook.result.current.isLoading).toBe(true)
  })

  it('requires explicit database when dbModel metadata is missing', () => {
    const models = defineModels({
      Task: dbModel(),
    })

    expect(() =>
      createDB({
        name: 'missing-db',
        models,
      }),
    ).toThrow(/requires \{ database \}/)
  })

  it('auto-bootstraps dbModel metadata and maps camelCase fields to storage columns', async () => {
    const models = defineModels({
      Author: dbModel({
        __typeMeta: {
          fields: {
            name: { kind: 'string', optional: false },
          },
        },
      }),
      Book: dbModel({
        __typeMeta: {
          fields: {
            title: { kind: 'string', optional: false },
            authorId: { kind: 'string', optional: false },
          },
        },
      }),
    })

    const db = createDB({
      name: 'dbmodel-type-meta',
      models,
      platform: 'web',
    })

    const author = await db.authors.create({ name: 'Cal Newport' })
    expect(author.error).toBe(null)
    const authorId = String(author.data?.id)
    expect(typeof db.useBooksByAuthorId).toBe('function')

    const createdBook = await db.books.create({
      title: 'Deep Work',
      authorId,
    })
    expect(createdBook.error).toBe(null)
    expect(createdBook.data?.authorId).toBe(authorId)

    const list = await db.books.fetch({
      where: { authorId },
      limit: 10,
    })
    expect(list.error).toBe(null)
    expect((list.data || []).length).toBe(1)
    expect(list.data?.[0]?.authorId).toBe(authorId)
  })

  it('plans additive smart migrations from previous snapshots', () => {
    const previousSnapshot = createSchemaSnapshot(
      [
        {
          table: 'tasks',
          columns: [{ name: 'name', type: 'string', isIndexed: false, isOptional: false }].concat(
            baseSystemColumns,
          ),
        },
      ],
      1,
    )

    const TaskModel = defineModel('tasks', {
      name: string(),
      is_done: boolean(),
    })

    const db = createDB({
      name: 'migration-additive',
      models: [TaskModel],
      platform: 'web',
      migration: {
        mode: 'smart',
        previousSnapshot,
      },
    })

    expect(db.migration).toBeTruthy()
    expect(db.migration.hasChanges).toBe(true)
    expect(db.migration.blockedDestructiveChanges).toHaveLength(0)
    expect(db.migration.nextSchemaVersion).toBe(2)
    expect(db.snapshot.schemaVersion).toBe(2)
    expect(Array.isArray(db.migration.steps)).toBe(true)
    expect(db.migration.steps.length).toBeGreaterThan(0)
  })

  it('blocks destructive schema changes when columns are removed', () => {
    const previousSnapshot = createSchemaSnapshot(
      [
        {
          table: 'tasks',
          columns: [
            { name: 'name', type: 'string', isIndexed: false, isOptional: false },
            { name: 'is_done', type: 'boolean', isIndexed: false, isOptional: false },
          ].concat(baseSystemColumns),
        },
      ],
      3,
    )

    const TaskModel = defineModel('tasks', {
      is_done: boolean(),
    })

    expect(() =>
      createDB({
        name: 'migration-destructive',
        models: [TaskModel],
        platform: 'web',
        migration: {
          mode: 'smart',
          previousSnapshot,
        },
      }),
    ).toThrow(/Destructive migration changes are blocked/)
  })

  it('detects simple one-to-one rename and avoids destructive block in smart mode', () => {
    const previousSnapshot = createSchemaSnapshot(
      [
        {
          table: 'tasks',
          columns: [{ name: 'name', type: 'string', isIndexed: false, isOptional: false }].concat(
            baseSystemColumns,
          ),
        },
      ],
      5,
    )

    const TaskModel = defineModel('tasks', {
      title: string(),
    })

    const db = createDB({
      name: 'migration-rename',
      models: [TaskModel],
      platform: 'web',
      migration: {
        mode: 'smart',
        previousSnapshot,
      },
    })

    expect(db.migration.blockedDestructiveChanges).toHaveLength(0)
    expect(db.migration.renameMap.tasks.name).toBe('title')
    expect(db.snapshot.schemaVersion).toBe(6)
  })
})
