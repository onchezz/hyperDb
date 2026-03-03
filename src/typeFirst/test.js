import { renderHook } from '@testing-library/react-hooks'

import { mockDatabase } from '../__tests__/testModels'
import { createDB } from './createDB'
import { dbModel, defineModels } from './defineModels'
import { relation } from './relation'

describe('typeFirst', () => {
  let database
  let tasks

  beforeEach(() => {
    ;({ database, tasks } = mockDatabase())
  })

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
})
