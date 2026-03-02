# Enhanced WatermelonDB: Installation and npm Packaging

This guide is the full setup for this fork in three modes:

1. Install from a published npm package (`@onchezz/watermelondb-localfirst`)
2. Install from a local tarball for development
3. Build and publish your own package version from this repo

## 1) Prerequisites

- Node.js 18+
- npm 9+
- For mobile apps: Android Studio / Xcode
- For Expo native builds: Expo SDK 55+ with `expo run:*`

## 2) Install in app from npm (recommended when published)

```bash
npm install @onchezz/watermelondb-localfirst
```

Use same imports as the original package:

```ts
import { Database, createReactiveClient } from '@onchezz/watermelondb-localfirst'
import SQLiteAdapter from '@onchezz/watermelondb-localfirst/adapters/sqlite'
import { useReactiveQuery } from '@onchezz/watermelondb-localfirst/reactive/react'
```

## 3) Install from local tarball (recommended while developing the fork)

From this fork repo:

```bash
npm run build
cd dist
npm pack
```

In your app:

```bash
npm install /absolute/path/to/watermelondb/dist/nozbe-watermelondb-0.28.1-0.tgz
```

## 4) Build an npm-ready package tarball with this fork branding

This repo includes a packaging script that rewrites package metadata for publishing under your scope:

```bash
npm run build:enhanced:npm
```

Output directory:

- `.npm-package/`

Generated package defaults:

- name: `@onchezz/watermelondb-localfirst`
- version: `<base-version>.enhanced.0` (or `<base-version>-enhanced.0`)

Override package metadata:

```bash
PACKAGE_NAME=@your-scope/watermelondb-localfirst npm run build:enhanced:npm
ENHANCED_VERSION=0.28.1-enhanced.2 npm run build:enhanced:npm
```

## 5) Publish to npm

Login first:

```bash
npm login
npm whoami
```

Publish:

```bash
npm run publish:enhanced:npm
```

Publish with custom tag:

```bash
NPM_TAG=next npm run publish:enhanced:npm
```

## 6) Expo native setup (using enhanced package)

In Expo project:

```bash
npm install @onchezz/watermelondb-localfirst
npx expo run:android
# or
npx expo run:ios
```

Use package entrypoints only:

- `@onchezz/watermelondb-localfirst`
- `@onchezz/watermelondb-localfirst/adapters/sqlite`
- `@onchezz/watermelondb-localfirst/reactive/react`

Do not import internal `src/...` paths.

## 7) Reactive usage example

```tsx
import { createReactiveClient } from '@onchezz/watermelondb-localfirst'
import { useReactiveQuery } from '@onchezz/watermelondb-localfirst/reactive/react'

const reactive = createReactiveClient(database)

const { data, isLoading, error } = useReactiveQuery(
  () => reactive.from('tasks').order('created_at', { ascending: false }),
  [],
)
```

## 8) Troubleshooting

### Package not found

- Run `npm install`
- Confirm package name/scope is correct

### Flow syntax errors (for example `@lazy`)

- You are importing `src/...` internals. Use package entrypoints only.

### Native app still using old binary

- Rebuild with `npx expo run:android` or `npx expo run:ios`
