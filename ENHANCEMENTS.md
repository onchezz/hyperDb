# WatermelonDB Enhancement Kickoff

This fork is set up to track upstream WatermelonDB and layer targeted improvements in small, reviewable batches.

## Enhancement Objectives

1. Improve reliability and predictability around sync and migrations.
2. Improve developer ergonomics in TypeScript-heavy projects.
3. Keep performance-sensitive paths measurable before and after each change.

## Initial Enhancement Backlog

1. Baseline benchmarks for query/read/write hot paths before code changes.
2. Add focused type-level tests around public APIs that rely on complex generics.
3. Harden migration and sync edge-case tests to reduce regression risk.
4. Evaluate selective micro-optimizations in frequently executed query helpers.

## Working Rules

1. One enhancement per branch/PR with tests included.
2. Avoid cross-cutting refactors without benchmark evidence.
3. Keep this file updated with completed work and follow-ups.

## Progress

1. 2026-03-01: Improved TypeScript ergonomics by accepting readonly arrays in query helper typings (`query`, `extend`, `Q.and`, `Q.or`, `Q.on`, `experimentalJoinTables`, `unsafeSqlQuery`) and added typetest coverage in `examples/typescript/__typetests__/query.ts`.
2. 2026-03-02: Added peer sync transport API for secure P2P synchronization over app-defined channels (WebRTC/Bluetooth/LAN), including client/server RPC helpers, tests, and documentation for Expo New Architecture integration.
3. 2026-03-02: Added a Supabase-style reactive client API (`createReactiveClient`) and React wrappers (`useReactiveQuery`, `useReactiveSingle`, `ReactiveQuery`) so UI can subscribe to Watermelon data without manual `useEffect` subscription wiring.
