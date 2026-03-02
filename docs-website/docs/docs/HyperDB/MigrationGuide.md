---
title: Migration Guide (WatermelonDB -> HyperDB)
---

# Migration Guide (WatermelonDB -> HyperDB)

This guide helps existing WatermelonDB projects adopt HyperDB safely.

## Migration scope

HyperDB migration is primarily about package identity and app-level integration APIs.

You usually keep:

- Existing schema definitions
- Existing model classes
- Existing migration history

You change:

- Import paths
- App data-access layer patterns
- Optional React reactive wrappers
- Optional peer sync transport hooks

## Step 1: install HyperDB package

```bash
npm install @onchezz/hyperdb
```

## Step 2: update imports

Typical replacements:

```diff
- import { Database } from '@nozbe/watermelondb'
- import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
+ import { Database } from '@onchezz/hyperdb'
+ import SQLiteAdapter from '@onchezz/hyperdb/adapters/sqlite'
```

Reactive API:

```diff
- import { createReactiveClient } from '@nozbe/watermelondb'
+ import { createReactiveClient } from '@onchezz/hyperdb'
```

React wrappers:

```diff
- import { useReactiveQuery } from '@nozbe/watermelondb/reactive/react'
+ import { useReactiveQuery } from '@onchezz/hyperdb/reactive/react'
```

## Step 3: keep DB bootstrap shape

```ts
const adapter = new SQLiteAdapter({ schema, dbName: 'app_db', jsi: true })

export const database = new Database({
  adapter,
  modelClasses: [Task, Project],
})
```

## Step 4: introduce local-first service layer

Create a `reactive` client once and expose domain methods from service modules.

```ts
export const reactive = createReactiveClient(database)

export const projectsService = {
  list: () => reactive.from('projects').order('created_at', { ascending: false }).fetch(),
}
```

## Step 5: simplify components with hooks

Before (manual subscription):

```tsx
useEffect(() => {
  const unsubscribe = reactive.from('tasks').eq('project_id', projectId).subscribe(setStateFromResponse)
  return unsubscribe
}, [projectId])
```

After:

```tsx
const { data, error, isLoading } = useReactiveQuery(
  () => reactive.from('tasks').eq('project_id', projectId),
  [projectId],
)
```

## Step 6: native rebuild for Expo/React Native

After dependency changes:

```bash
npx expo run:android
# or
npx expo run:ios
```

## Step 7: verify app behavior

Checklist:

1. App boots and database opens.
2. Reads return expected rows.
3. Writes update local state and UI reactively.
4. Migrations run cleanly for upgraded users.
5. Sync flow still works (HTTP and/or peer).

## Migration risks

1. Mixed imports (`@nozbe/...` and `@onchezz/...`) in same app.
2. Old lockfile retaining stale package transitive graph.
3. Internal package import paths (`src/...`) causing bundler/parser errors.
4. Missing schema columns referenced by new chain filters.

## Rollback strategy

- Keep migration in a feature branch.
- Release to staged internal testers first.
- Preserve previous dependency lock state for quick rollback.
- Toggle new service wrappers gradually by feature module.

## Success criteria

Migration is successful when:

- App behavior is unchanged for existing data flows.
- Reactive read code is simpler and standardized.
- Package/import paths are unified on HyperDB.
- Documentation and examples in your project match HyperDB naming.
