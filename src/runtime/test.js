import { renderHook } from '@testing-library/react-hooks'

import { mockDatabase } from '../__tests__/testModels'
import { defineModel, relation, string, number, createHyperTill } from '..'

describe('runtime createHyperTill', () => {
  let database
  let projects
  let tasks

  beforeEach(() => {
    ;({ database, projects, tasks } = mockDatabase())
  })

  it('provides model APIs for query/create/update/delete', async () => {
    const models = [
      defineModel('mock_projects', {
        name: string(),
      }),
      defineModel('mock_tasks', {
        name: string(),
        position: number(),
        projectId: relation('mock_projects'),
      }),
    ]

    const db = createHyperTill({ database, models })

    let projectId

    await database.write(async () => {
      const project = await projects.create((record) => {
        record.name = 'Project 1'
      })
      projectId = project.id
    })

    const created = await db.mock_tasks.create({
      name: 'Task A',
      position: 1,
      project_id: projectId,
    })

    expect(created.error).toBe(null)
    expect(created.data).toHaveLength(1)

    const listed = await db.mock_tasks.fetch({
      where: { project_id: projectId },
      orderBy: { column: 'position', ascending: true },
    })

    expect(listed.error).toBe(null)
    expect((listed.data || []).map((row) => row.name)).toEqual(['Task A'])
  })

  it('exposes no-useEffect hooks for list and by-id', async () => {
    const models = [
      defineModel('mock_projects', {
        name: string(),
      }),
      defineModel('mock_tasks', {
        name: string(),
        position: number(),
        projectId: relation('mock_projects'),
      }),
    ]

    const db = createHyperTill({ database, models })

    let projectId
    let taskId

    await database.write(async () => {
      const project = await projects.create((record) => {
        record.name = 'Project 1'
      })
      projectId = project.id

      const task = await tasks.create((record) => {
        record.name = 'Task A'
        record.position = 1
        record.projectId = projectId
      })

      taskId = task.id
    })

    const listHook = renderHook(() => db.mock_tasks.useByProjectId(projectId))
    expect(listHook.result.current.error).toBe(null)
    expect(Array.isArray(listHook.result.current.data) || listHook.result.current.isLoading).toBe(true)

    const byIdHook = renderHook(() => db.mock_tasks.useById(taskId))
    expect(byIdHook.result.current.error).toBe(null)
    expect(byIdHook.result.current.data?.id || byIdHook.result.current.isLoading).toBeTruthy()
  })
})
