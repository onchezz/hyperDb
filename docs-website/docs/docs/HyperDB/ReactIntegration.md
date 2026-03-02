---
title: React Integration
---

# React Integration

HyperDB adds React-oriented query wrappers so components can be reactive without repetitive subscription plumbing.

## Hooks

### `useReactiveQuery(buildQuery, deps?)`

Use for collection/list reads.

```tsx
import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'

const { data, isLoading, error } = useReactiveQuery(
  () => reactive.from('tasks').eq('is_done', false).order('created_at', { ascending: false }),
  [],
)
```

### `useReactiveSingle(buildQuery, deps?)`

Use for single-row reads.

```tsx
const { data: task, isLoading, error } = useReactiveSingle(
  () => reactive.from('tasks').eq('id', taskId),
  [taskId],
)
```

## Render component helper

`ReactiveQuery` can be used to declaratively render loading/error/data states in component trees where hooks are awkward.

## Recommended component pattern

1. Build/compose query in data service or local module.
2. Consume with hook in component.
3. Handle writes via service methods.
4. Keep UI pure and event handlers thin.

## Error handling guidance

- Always render or log query `error` branch.
- Keep write errors attached to action state (`setActionError`).
- Avoid swallowing errors in event handlers.

## Dependency guidance

- Include all query-driving params in `deps`.
- Keep callback stable and deterministic.
- Avoid dynamic query structure from unstable objects unless memoized.

## Example with filters

```tsx
const { data, isLoading } = useReactiveQuery(
  () =>
    reactive
      .from('tasks')
      .eq('project_id', projectId)
      .eq('is_done', showDone)
      .order('position', { ascending: true }),
  [projectId, showDone],
)
```

If your local schema does not define `project_id`, remove that filter.
