---
title: HyperDB Project Identity
hide_title: false
---

# HyperDB Project Identity

HyperDB is the enhanced distribution and docs identity for this repository.

It is implemented on top of WatermelonDB and keeps WatermelonDB core semantics while adding:

1. Supabase-style local query ergonomics
2. React convenience wrappers for reactive reads
3. Peer sync transport primitives with explicit security hooks

## Naming

Current project naming used in docs and package outputs:

- Repository/docs identity: `hyperDb`
- npm package identity: `@onchezz/hyperdb`

## Why keep WatermelonDB underneath

WatermelonDB already provides:

- Strong local-first performance characteristics
- Mature model/schema/migration primitives
- SQLite-backed query execution and observable update graph

HyperDB focuses on developer experience and integration workflows, not replacing the core engine.

## Migration guidance

If your app previously imported `@nozbe/watermelondb`, plan a controlled migration:

1. Install `@onchezz/hyperdb`
2. Switch imports to HyperDB package entrypoints
3. Keep existing schema/model definitions (compatible)
4. Adopt `createReactiveClient` and hooks where useful
5. Rebuild native app for Expo/React Native after dependency switch

## Related docs

- [Overview](./HyperDB/Overview.md)
- [Local-First API](./HyperDB/LocalFirstApi.md)
- [React Integration](./HyperDB/ReactIntegration.md)
- [Expo Setup](./HyperDB/ExpoSetup.md)
- [Publishing](./HyperDB/Publishing.md)
