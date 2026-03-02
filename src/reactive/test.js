import { mockDatabase } from '../__tests__/testModels'
import { createReactiveClient } from './index'

describe('reactive client', () => {
  let database
  let projects
  let tasks
  let client
  let projectId

  beforeEach(async () => {
    ;({ database, projects, tasks } = mockDatabase())
    client = createReactiveClient(database)

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

  it('supports supabase-like filtering and selection', async () => {
    const response = await client
      .from('mock_tasks')
      .select('id,name,position')
      .eq('is_completed', false)
      .order('position', { ascending: false })
      .limit(1)
      .fetch()

    expect(response.error).toBe(null)
    expect(response.data).toHaveLength(1)
    expect(response.data[0]).toMatchObject({
      name: 'Task B',
      position: 2,
    })
    expect(response.data[0]._status).toBeUndefined()
    expect(response.data[0]._changed).toBeUndefined()
  })

  it('supports single and maybeSingle semantics', async () => {
    const single = await client.from('mock_tasks').eq('name', 'Task A').single()
    expect(single.error).toBe(null)
    expect(single.data && single.data.name).toBe('Task A')

    const maybe = await client.from('mock_tasks').eq('name', 'Missing').maybeSingle()
    expect(maybe.error).toBe(null)
    expect(maybe.data).toBe(null)

    const invalidSingle = await client.from('mock_tasks').single()
    expect(invalidSingle.data).toBe(null)
    expect(invalidSingle.error && invalidSingle.error.message).toContain('Expected a single row')
  })

  it('emits reactive updates through subscribe()', async () => {
    const emissions = []

    await new Promise((resolve, reject) => {
      let unsubscribe = () => {}
      unsubscribe = client
        .from('mock_tasks')
        .eq('is_completed', false)
        .order('position')
        .subscribe((response) => {
          emissions.push((response.data || []).map((row) => row.name))

          if (emissions.length === 1) {
            client
              .from('mock_tasks')
              .eq('name', 'Task A')
              .update({ is_completed: true })
              .catch(reject)
          } else if (emissions.length === 2) {
            unsubscribe()
            resolve()
          }
        })
    })

    expect(emissions).toEqual([['Task A', 'Task B'], ['Task B']])
  })

  it('supports insert/update/delete/upsert operations', async () => {
    const inserted = await client.from('mock_tasks').insert({
      name: 'Task D',
      position: 4,
      is_completed: false,
      project_id: projectId,
    })
    expect(inserted.error).toBe(null)
    expect(inserted.data).toHaveLength(1)
    const insertedId = inserted.data && inserted.data[0] && inserted.data[0].id

    const updated = await client.from('mock_tasks').eq('id', insertedId).update({
      is_completed: true,
      description: 'patched',
    })
    expect(updated.error).toBe(null)
    expect(updated.data && updated.data[0]).toMatchObject({
      id: insertedId,
      is_completed: true,
      description: 'patched',
    })

    const upsertExisting = await client.from('mock_tasks').upsert({
      id: insertedId,
      name: 'Task D+',
      position: 4,
      is_completed: true,
      project_id: projectId,
    })
    expect(upsertExisting.error).toBe(null)
    expect(upsertExisting.data && upsertExisting.data[0].name).toBe('Task D+')

    const upsertNew = await client.from('mock_tasks').upsert({
      name: 'Task E',
      position: 5,
      is_completed: false,
      project_id: projectId,
    })
    expect(upsertNew.error).toBe(null)
    expect(upsertNew.data && upsertNew.data[0].name).toBe('Task E')

    const deleted = await client.from('mock_tasks').eq('id', insertedId).delete()
    expect(deleted.error).toBe(null)
    expect(deleted.data).toHaveLength(1)

    const afterDelete = await client.from('mock_tasks').eq('id', insertedId).fetch()
    expect(afterDelete.error).toBe(null)
    expect(afterDelete.data).toEqual([])
  })

  it('returns errors for unsupported upsert conflict keys', async () => {
    await expect(
      client.from('mock_tasks').upsert(
        {
          id: 'abc',
          name: 'Task X',
          position: 99,
          is_completed: false,
          project_id: projectId,
        },
        { onConflict: 'name' },
      ),
    ).rejects.toThrow(`onConflict: 'id' only`)
  })
})
