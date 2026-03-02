import * as React from 'react'
import { Database, createReactiveClient } from '@nozbe/watermelondb'
import { ReactiveQuery, useReactiveQuery, useReactiveSingle } from '@nozbe/watermelondb/react'
import { expectType } from 'tsd-check'

const database: Database = null as any
const reactive = createReactiveClient(database)

function HookExample({ projectId }: { projectId: string }) {
  const queryState = useReactiveQuery(
    () => reactive.from('mock_tasks').eq('project_id', projectId).order('position'),
    [projectId],
  )
  const singleState = useReactiveSingle(() => reactive.from('mock_tasks').eq('id', 'task-id').limit(1), [])

  if (queryState.data) {
    queryState.data.forEach((row) => {
      expectType<any>(row.id)
    })
  }
  expectType<boolean>(singleState.isLoading)

  return (
    <ReactiveQuery buildQuery={() => reactive.from('mock_tasks').eq('project_id', projectId)} deps={[projectId]}>
      {(state) => <>{state.data?.length ?? 0}</>}
    </ReactiveQuery>
  )
}

void HookExample
