---
title: HyperDB Practical Examples
---

# HyperDB Practical Examples

This page gives complete examples of how to use HyperDB in app code.

## Example 1: tasks service + reactive UI

### Folder shape

```text
src/
  database/
    schema.ts
    index.ts
    reactive.ts
  services/
    tasksService.ts
  screens/
    TasksScreen.tsx
```

### `database/reactive.ts`

```ts
import { createReactiveClient } from '@onchezz/hyperdb'
import { database } from './index'

export const reactive = createReactiveClient(database)
```

### `services/tasksService.ts`

```ts
import { reactive } from '../database/reactive'

export type TaskRow = {
  id?: string
  name: string
  project_id: string
  is_done: boolean
  position: number
  created_at: number
}

export const tasksService = {
  listByProject: (projectId: string) =>
    reactive
      .from<TaskRow>('tasks')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .fetch(),

  create: (projectId: string, name: string, position: number) =>
    reactive.from<TaskRow>('tasks').insert({
      project_id: projectId,
      name,
      is_done: false,
      position,
      created_at: Date.now(),
    }),

  toggleDone: (id: string, next: boolean) => reactive.from<TaskRow>('tasks').eq('id', id).update({ is_done: next }),

  remove: (id: string) => reactive.from<TaskRow>('tasks').eq('id', id).delete(),
}
```

### `screens/TasksScreen.tsx`

```tsx
import React, { useState } from 'react'
import { Button, Text, TextInput, View } from 'react-native'
import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'

import { reactive } from '../database/reactive'
import { tasksService } from '../services/tasksService'

export function TasksScreen({ projectId }: { projectId: string }) {
  const [name, setName] = useState('')

  const { data, isLoading, error } = useReactiveQuery(
    () => reactive.from('tasks').eq('project_id', projectId).order('position', { ascending: true }),
    [projectId],
  )

  const tasks = data ?? []

  async function onAdd() {
    if (!name.trim()) return
    await tasksService.create(projectId, name.trim(), tasks.length + 1)
    setName('')
  }

  if (isLoading) return <Text>Loading...</Text>
  if (error) return <Text>{error.message}</Text>

  return (
    <View>
      <TextInput value={name} onChangeText={setName} placeholder="Task name" />
      <Button title="Add" onPress={onAdd} />
      {tasks.map((task) => (
        <View key={task.id}>
          <Text>{task.name}</Text>
          <Button title={task.is_done ? 'Mark open' : 'Mark done'} onPress={() => tasksService.toggleDone(task.id, !task.is_done)} />
          <Button title="Delete" onPress={() => tasksService.remove(task.id)} />
        </View>
      ))}
    </View>
  )
}
```

## Example 2: single-row detail screen

```tsx
import { useReactiveSingle } from '@onchezz/hyperdb/reactive/react'

function TaskDetail({ taskId }: { taskId: string }) {
  const { data: task, isLoading, error } = useReactiveSingle(
    () => reactive.from('tasks').eq('id', taskId),
    [taskId],
  )

  if (isLoading) return <Text>Loading...</Text>
  if (error) return <Text>{error.message}</Text>
  if (!task) return <Text>Task not found</Text>

  return <Text>{task.name}</Text>
}
```

## Example 3: pagination-style reads

```ts
const page = await reactive
  .from('tasks')
  .eq('project_id', projectId)
  .order('position', { ascending: true })
  .range(0, 49)
  .fetch()
```

## Example 4: combining local-first reads with network sync

```ts
async function refreshFromServer() {
  // 1) pull remote delta via your API
  const response = await fetch('https://api.example.com/sync/pull')
  const payload = await response.json()

  // 2) apply changes using app-specific sync/writer logic
  await applySyncPayloadToDatabase(payload)

  // 3) UI updates automatically via reactive hooks
}
```

## Example 5: peer sync transport wiring (high level)

```ts
import { createPeerSyncClient } from '@onchezz/hyperdb/sync'

const peerClient = createPeerSyncClient({
  database,
  transport,
  codec,
  channelId: `project:${projectId}`,
})

await peerClient.connect()
await peerClient.syncOnce()
await peerClient.disconnect()
```

Use authenticated encryption codec and peer authorization before production rollout.

## Example anti-patterns to avoid

1. Importing `src/...` from the package.
2. Running writes from random UI code paths instead of service layer.
3. Using non-indexed columns in frequently-used filters.
4. Assuming `project_id` exists unless you defined it in schema.
5. Treating local-first values like server-managed defaults.
