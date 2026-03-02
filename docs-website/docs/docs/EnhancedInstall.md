---
id: EnhancedInstall
title: Enhanced Install & npm Publish
---

# Enhanced install and npm publish

This page covers full setup for the enhanced fork with Expo/React Native and npm publishing.

## Install options

### Option A: Published npm package

Install the fork package under your scope:

```bash
npm install @onchezz/watermelondb-localfirst
```

Use imports from the scoped package:

```ts
import { Database, createReactiveClient } from '@onchezz/watermelondb-localfirst'
import SQLiteAdapter from '@onchezz/watermelondb-localfirst/adapters/sqlite'
import { useReactiveQuery } from '@onchezz/watermelondb-localfirst/reactive/react'
```

### Option B: Local tarball from fork

In fork repo:

```bash
npm run build
cd dist
npm pack
```

In your app:

```bash
npm install /absolute/path/to/watermelondb/dist/nozbe-watermelondb-0.28.1-0.tgz
```

## Build npm-ready package from fork

From fork root:

```bash
npm run build:enhanced:npm
```

Output:

- `.npm-package/onchezz-watermelondb-localfirst-<version>.tgz`

Defaults:

- package name: `@onchezz/watermelondb-localfirst`
- version suffix: `.enhanced.0`

Override values:

```bash
PACKAGE_NAME=@your-scope/watermelondb-localfirst npm run build:enhanced:npm
ENHANCED_VERSION=0.28.1-enhanced.2 npm run build:enhanced:npm
```

## Publish to npm

```bash
npm login
npm whoami
npm run publish:enhanced:npm
```

Publish prerelease tag:

```bash
NPM_TAG=next npm run publish:enhanced:npm
```

## Expo native setup

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

Avoid internal `src/...` imports.

## Troubleshooting

- Package not found: verify scope and version, then run `npm install`.
- Flow syntax errors like `@lazy`: remove `src/...` imports.
- Native app stale: rebuild with `expo run:*`.
