import React from 'react'
import { renderHook, act } from '@testing-library/react-hooks'

import DatabaseProvider from '../../react/DatabaseProvider'
import { mockDatabase } from '../../__tests__/testModels'
import { createReactiveClient } from '..'
import { useReactiveQuery, useReactiveSingle } from './index'

describe('reactive/react hooks', () => {
  let database
  let projects
  let tasks
  let projectId
  let reactive
  let wrapper

  beforeEach(async () => {
    ;({ database, projects, tasks } = mockDatabase())
    reactive = createReactiveClient(database)
    wrapper = ({ children }) => <DatabaseProvider database={database}>{children}</DatabaseProvider>

    await database.write(async () => {
      const project = await projects.create((record) => {
        record.name = 'Project 1'
      })
      projectId = project.id

      await tasks.create((record) => {
        record.name = 'Task A'
        record.position = 1
        record.isCompleted = false
        record.projectId = projectId
      })
      await tasks.create((record) => {
        record.name = 'Task B'
        record.position = 2
        record.isCompleted = false
        record.projectId = projectId
      })
      await tasks.create((record) => {
        record.name = 'Task C'
        record.position = 3
        record.isCompleted = true
        record.projectId = projectId
      })
    })
  })

  it('provides reactive query data without manual useEffect wiring', async () => {
    const { result, waitFor } = renderHook(
      () =>
        useReactiveQuery(
          () => reactive.from('mock_tasks').eq('is_completed', false).order('position'),
          [reactive],
        ),
      { wrapper },
    )

    await waitFor(() => result.current.isLoading === false)
    expect((result.current.data || []).map((row) => row.name)).toEqual(['Task A', 'Task B'])

    await act(async () => {
      await reactive.from('mock_tasks').eq('name', 'Task A').update({ is_completed: true })
    })

    await waitFor(() => (result.current.data || []).map((row) => row.name).join(',') === 'Task B')
    expect((result.current.data || []).map((row) => row.name)).toEqual(['Task B'])
  })

  it('provides single-row convenience hook', async () => {
    const { result, waitFor } = renderHook(
      () =>
        useReactiveSingle(() => reactive.from('mock_tasks').eq('name', 'Task C').limit(1), [reactive]),
      { wrapper },
    )

    await waitFor(() => result.current.isLoading === false)
    expect(result.current.error).toBe(null)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data && result.current.data.name).toBe('Task C')
  })
})
