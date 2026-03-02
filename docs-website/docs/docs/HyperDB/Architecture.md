---
title: HyperDB Architecture
---

# HyperDB Architecture

HyperDB is a layered architecture over WatermelonDB.

## Layer map

1. **Storage layer**
- Adapter (`SQLiteAdapter`/Loki) and WatermelonDB database.
- Handles persistence, migrations, and raw record I/O.

2. **Core model/query layer (WatermelonDB)**
- Models, collections, query compilation and execution.
- Native-thread SQLite execution path on mobile.
- Observable data graph for record/query changes.

3. **HyperDB reactive client layer**
- Chain builder API:
  - `from(table)`
  - filter/order/range/select methods
  - mutators (`insert`, `update`, `upsert`, `delete`)
- Response envelope contract with `data/error`.

4. **HyperDB React integration layer**
- Hook wrappers around query subscriptions:
  - `useReactiveQuery`
  - `useReactiveSingle`
- Component helper:
  - `ReactiveQuery`

5. **Optional HyperDB peer sync layer**
- Protocol helper surface:
  - `createPeerSyncClient`
  - `startPeerSyncServer`
- App-supplied transport and codec.

## Query flow

```text
UI Hook -> HyperDB chain query -> Watermelon query plan -> adapter execution -> results
      ^                                                           |
      |----------------------- change observation ----------------|
```

## Write flow

```text
Service method -> reactive.from(...).update()/insert()/delete()
               -> Watermelon writer path
               -> transaction/write
               -> observables emit
               -> UI hooks refresh
```

## Where to put app logic

Recommended separation:

- `database/index.ts`: adapter + database bootstrap
- `database/reactive.ts`: shared `reactive` client
- `database/localFirst.ts`: domain API wrappers
- `components/screens`: use hooks and service methods, avoid raw DB details

## Why this design

- Preserves WatermelonDB strengths (performance, schema/migration model).
- Avoids repetitive manual `useEffect` subscriptions in every component.
- Allows app teams to keep an explicit domain API while still being reactive.

## Backward compatibility

HyperDB additions are incremental. Existing WatermelonDB model/schema patterns remain valid.

## Performance expectations

- Query/filter/order execution remains on WatermelonDB execution layer.
- React hooks add convenience, not a new database engine.
- Production performance still depends on schema/index quality and query shape.
