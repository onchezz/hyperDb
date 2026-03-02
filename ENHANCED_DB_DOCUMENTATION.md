# Enhanced WatermelonDB Fork Documentation

This document describes the enhancements in this fork, how to use them, and how to publish/consume the fork in React Native or Expo native apps.

## Repository scope

Base: `Nozbe/WatermelonDB`  
Enhancement branch: `codex/enhancement-bootstrap`

Enhancements shipped in this fork:

1. Supabase-style reactive client API for local Watermelon tables.
2. React helpers for reactive queries (`useReactiveQuery`, `useReactiveSingle`, `ReactiveQuery`).
3. Secure peer-to-peer sync transport abstraction for WebRTC/Bluetooth/LAN channels.
4. TypeScript ergonomics improvements for readonly-array query helpers.

## Enhancement map

### Reactive client

- Source:
  - `src/reactive/index.js`
  - `src/reactive/index.d.ts`
  - `src/index.js`
  - `src/index.d.ts`
- React wrappers:
  - `src/reactive/react/index.js`
  - `src/reactive/react/index.d.ts`
  - `src/react/index.js`
  - `src/react/index.d.ts`
- Tests:
  - `src/reactive/test.js`
  - `src/reactive/react/test.js`

### Peer-to-peer sync

- Source:
  - `src/sync/peer/index.js`
  - `src/sync/peer/index.d.ts`
  - `src/sync/index.js`
  - `src/sync/index.d.ts`
- Tests:
  - `src/sync/peer/test.js`

### TypeScript readonly-array support

- Source:
  - `src/QueryDescription/operators.d.ts`
  - `src/utils/fp/arrayOrSpread/index.d.ts`
- Typetests:
  - `examples/typescript/__typetests__/query.ts`

## API overview

### 1) `createReactiveClient(database)`

Exported from `@nozbe/watermelondb`.

```ts
import { createReactiveClient } from '@nozbe/watermelondb'

const reactive = createReactiveClient(database)
```

Entry point:

```ts
reactive.from<Row>('table_name')
```

Query methods:

- `select`
- `eq`, `neq`
- `gt`, `gte`, `lt`, `lte`
- `in`
- `match`
- `order`
- `limit`
- `range`

Read methods:

- `fetch`
- `single`
- `maybeSingle`
- `observe`
- `subscribe`

Write methods:

- `insert`
- `update`
- `delete`
- `upsert`

Response envelope:

```ts
type ReactiveResponse<T> = { data: T | null; error: Error | null }
```

### 2) React helpers

Exported from `@nozbe/watermelondb/reactive/react`.

- `useReactiveQuery(buildQuery, deps?)`
- `useReactiveSingle(buildQuery, deps?)`
- `ReactiveQuery`

These helpers reduce component boilerplate by handling subscription lifecycle and loading/error state.

### 3) Peer sync transport layer

Exported from `@nozbe/watermelondb/sync`.

- `createPeerSyncClient`
- `startPeerSyncServer`

You provide:

- `transport` (`send` + `subscribe`)
- `codec` (`encode` + `decode`) for encrypted/authenticated messages

Security default:

- codec is required unless explicitly opting into `unsafeAllowUnencryptedMessages: true` for local development only.

## Security model for peer sync

1. Use encrypted/authenticated codecs (AES-GCM, libsodium, Noise, etc.).
2. Use `authorize()` on server to validate peer/session token.
3. Set short-lived auth tokens (per-session/per-pairing).
4. Never ship plaintext mode in production.
5. Treat transport as untrusted; keep trust in your codec + authorization.

## Expo / React Native integration (native build)

This fork works with Expo native builds (development build / prebuild), and plain React Native apps.

Recommended setup:

1. Build package tarball from fork:
   - `cd watermelondb`
   - `npm run build`
   - `cd dist && npm pack`
2. Install in app:
   - `npm install ../watermelondb/dist/nozbe-watermelondb-<version>.tgz`
3. Run native build:
   - `npx expo run:android` or `npx expo run:ios`
4. Start Metro for dev client:
   - `npx expo start --dev-client -c`

Why tarball install:

- avoids symlink resolution edge cases in Metro/Expo.
- ensures package layout matches published shape (`index.js`, `adapters/*`, etc.).

## Development workflow

1. Sync with upstream:
   - `git fetch upstream`
   - `git checkout master`
   - `git rebase upstream/master`
2. Rebase enhancement branch:
   - `git checkout codex/enhancement-bootstrap`
   - `git rebase master`
3. Run checks:
   - `npm run eslint`
   - `npm run flow`
   - `npm run test`
   - `npm run test:typescript`

## Publishing to your GitHub

This machine currently has no GitHub auth configured. Once authenticated:

1. `gh auth login`
2. `gh repo create <owner>/watermelondb-localfirst --private --source=. --remote=origin --push`

Scripted option:

1. `gh auth login`
2. `./scripts/publish-enhanced-repo.sh <owner> watermelondb-localfirst private`

Alternative (manual):

1. Create repo in GitHub UI.
2. `git remote set-url origin git@github.com:<owner>/watermelondb-localfirst.git`
3. `git push -u origin codex/enhancement-bootstrap`

## Documentation index

- Enhancement tracker: `ENHANCEMENTS.md`
- Unreleased notes: `CHANGELOG-Unreleased.md`
- Reactive docs site page: `docs-website/docs/docs/Reactive.md`
- Peer sync docs site page: `docs-website/docs/docs/Sync/PeerToPeer.md`

## Known limitations

1. Reactive `upsert()` currently supports `onConflict: 'id'` only.
2. Peer sync transport is protocol-level only; application owns the actual WebRTC/Bluetooth channel setup.
3. Production peer sync requires secure codec + authorization strategy from the host app.
