---
title: Enhanced Fork
hide_title: true
---

# Enhanced fork guide

This repository is an enhanced fork of WatermelonDB with additional capabilities for reactive access and peer-to-peer synchronization.

## What was added

1. Supabase-style reactive client API (`createReactiveClient`).
2. React reactive wrappers (`useReactiveQuery`, `useReactiveSingle`, `ReactiveQuery`).
3. Secure peer-sync transport layer for local channels (WebRTC/Bluetooth/LAN).
4. Improved TypeScript ergonomics around readonly-array query helper types.

## Core docs

- [Reactive client](./Reactive.md)
- [Peer-to-peer sync](./Sync/PeerToPeer.md)
- [Sync frontend](./Sync/Frontend.md)

## Quick install in app projects

For Expo/React Native app consumption, use the built package artifact from this fork:

```bash
cd watermelondb
npm run build
cd dist && npm pack

# in your app
npm install ../watermelondb/dist/nozbe-watermelondb-0.28.1-0.tgz
```

## Native Expo (development build)

```bash
npx expo run:android
npx expo start --dev-client -c
```

## Security notes for peer sync

1. Provide a secure codec (`encode` + `decode`) for message encryption/authentication.
2. Use `authorize()` on server side.
3. Keep `unsafeAllowUnencryptedMessages` disabled in production.

## Repository and docs

- Source: [GitHub repository](https://github.com/onchezz/watermelondb-localfirst)
- This docs site: [GitHub Pages](https://onchezz.github.io/watermelondb-localfirst/)
