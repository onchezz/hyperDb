### Highlights

### BREAKING CHANGES

### Deprecations

### New features

- [Sync] Added peer sync transport layer (`createPeerSyncClient` / `startPeerSyncServer`) for WebRTC/Bluetooth/LAN channels, with secure codec support by default
- [Reactive] Added Supabase-style reactive API (`createReactiveClient`) and React hooks (`useReactiveQuery`, `useReactiveSingle`, `ReactiveQuery`) for simpler UI subscriptions

### Fixes

- [LokiJS] Multitab sync issue fix
- [Android] Added linker flag for building with 16kB page alignment
- [TS] make catchError visible to typescript

### Performance

### Changes

- Updated better-sqlite3 to 11.9.1

### Internal

- Updated internal dependencies
- Updated documentation scripts
