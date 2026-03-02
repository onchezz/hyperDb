---
title: Expo Native Setup
---

# Expo Native Setup

HyperDB supports Expo native builds (development build / prebuild), not plain Expo Go for SQLite-native integration patterns.

## Requirements

- Node 18+
- Expo SDK compatible with your React Native version
- Android Studio / Xcode toolchains
- `expo run:android` / `expo run:ios` workflow

## Install package

Published package route:

```bash
npm install @onchezz/hyperdb
```

Tarball route (fork development):

```bash
npm run build:enhanced:npm
npm install /absolute/path/to/onchezz-hyperdb-<version>.tgz
```

## Database bootstrap

```ts
import { Database } from '@onchezz/hyperdb'
import SQLiteAdapter from '@onchezz/hyperdb/adapters/sqlite'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'app_db',
  jsi: true,
  onSetUpError: (error) => console.error(error),
})

export const database = new Database({
  adapter,
  modelClasses: [Task],
})
```

## HyperDB reactive client

```ts
import { createReactiveClient } from '@onchezz/hyperdb'

export const reactive = createReactiveClient(database)
```

## Build commands

```bash
npx expo run:android
# or
npx expo run:ios
```

## Common Expo pitfalls

1. Importing internal `src/...` files from package.
2. Changing dependency source and not rebuilding native app.
3. Assuming remote persistence semantics for local fields.
4. Running only Metro restart for native module changes.

## Correct import entrypoints

- `@onchezz/hyperdb`
- `@onchezz/hyperdb/adapters/sqlite`
- `@onchezz/hyperdb/reactive/react`
- `@onchezz/hyperdb/sync`
