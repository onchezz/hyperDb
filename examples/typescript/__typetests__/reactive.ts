import { Database, createReactiveClient } from '@nozbe/watermelondb'
import { expectType } from 'tsd-check'

const database: Database = null as any
const client = createReactiveClient(database)

const query = client
  .from('mock_tasks')
  .select('id,name,is_completed')
  .eq('is_completed', false)
  .order('name')
  .limit(10)

query.subscribe((response) => {
  if (response.data) {
    response.data.forEach((row) => {
      expectType<any>(row.id)
    })
  }
})

query.observe()
query.fetch()
query.single()
query.maybeSingle()

client.from('mock_tasks').insert({
  name: 'Task X',
  position: 1,
  is_completed: false,
  project_id: 'project-id',
})

client.from('mock_tasks').eq('id', 'record-id').update({ is_completed: true })
client.from('mock_tasks').eq('id', 'record-id').delete()
client.from('mock_tasks').upsert({
  id: 'record-id',
  name: 'Task X',
  position: 2,
  is_completed: false,
  project_id: 'project-id',
})
