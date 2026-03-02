---
title: Peer-to-Peer
hide_title: true
---

# Peer-to-peer sync (WebRTC / Bluetooth)

WatermelonDB now includes a transport-agnostic peer sync RPC layer that can run over channels such as WebRTC DataChannel or Bluetooth.

This is exposed from `@nozbe/watermelondb/sync`:

- `createPeerSyncClient()` - produces `pullChanges` / `pushChanges` functions compatible with `synchronize()`
- `startPeerSyncServer()` - serves incoming sync requests from another device

## Security model

Peer sync requires a codec by default (`codec.encode()` / `codec.decode()`) so you can enforce authenticated encryption.

- Recommended: pass a secure codec (for example, one backed by libsodium, AES-GCM, Noise, or your existing session crypto)
- Development only: opt in to plaintext JSON with `unsafeAllowUnencryptedMessages: true`

## Basic flow

1. Establish a peer channel (WebRTC/Bluetooth/LAN socket)
2. Wrap that channel as a `PeerSyncTransport` (`send()` + `subscribe()`)
3. Start server on one peer
4. Create client on the other peer
5. Call `synchronize()` with client’s `pullChanges` / `pushChanges`

```js
import { synchronize, createPeerSyncClient, startPeerSyncServer } from '@nozbe/watermelondb/sync'

// Your encrypted codec (required unless unsafeAllowUnencryptedMessages=true)
const codec = {
  encode: async (message) => encryptAndSerialize(message),
  decode: async (payload) => deserializeAndDecrypt(payload),
}

// Example transport backed by your WebRTC/Bluetooth connection
const transport = {
  send: (message) => channel.send(message),
  subscribe: (listener) => {
    channel.onMessage(listener)
    return () => channel.offMessage(listener)
  },
}

const server = startPeerSyncServer({
  transport,
  codec,
  pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
    // Your peer-side sync backend implementation
    return { changes, timestamp }
  },
  pushChanges: async ({ changes, lastPulledAt }) => {
    // Apply incoming peer changes
    return {}
  },
  authorize: ({ authToken }) => {
    if (!isValidPeerToken(authToken)) {
      const error = new Error('Unauthorized peer')
      error.code = 'unauthorized'
      throw error
    }
  },
})

const peer = createPeerSyncClient({
  transport,
  codec,
  authToken: issueShortLivedPeerToken(),
})

await synchronize({
  database,
  pullChanges: peer.pullChanges,
  pushChanges: peer.pushChanges,
})

peer.close()
server.stop()
```

## Transport adapter examples

Peer sync is transport-agnostic. You map your channel to:

```ts
type PeerSyncTransport = {
  send: (encodedMessage: string) => Promise<void> | void
  subscribe: (listener: (encodedMessage: string) => Promise<void> | void) => (() => void) | void
}
```

### WebRTC DataChannel sketch

```ts
const transport = {
  send: (payload) => dataChannel.send(payload),
  subscribe: (listener) => {
    const handler = (event) => listener(event.data)
    dataChannel.addEventListener('message', handler)
    return () => dataChannel.removeEventListener('message', handler)
  },
}
```

### Bluetooth message bus sketch

```ts
const transport = {
  send: (payload) => bluetoothSession.send(payload),
  subscribe: (listener) => bluetoothSession.onMessage(listener),
}
```

## Error and timeout behavior

- Client requests time out after `30_000ms` by default (`timeoutMs` override available).
- If codec decode/encode fails, request fails with sync error.
- Server-side exceptions are serialized into `{ code, message }` error payloads.
- `authorize()` failures are propagated to the caller as failed sync requests.

## Production checklist

1. Use encrypted codec (never plaintext mode).
2. Use `authorize()` and rotate short-lived tokens.
3. Add replay protection/session binding in your codec layer.
4. Handle channel disconnects by calling `peer.close()` and retrying with backoff.
5. Instrument `onError` to capture transport/codec/server failures.

## Expo New Architecture compatibility

Peer sync module is pure JavaScript and does not require WatermelonDB native changes, so it works with Expo New Architecture setups as long as your chosen transport layer works there.

Guidelines:

1. Use transport libraries that support your Expo SDK and New Architecture configuration.
2. Keep transport wiring in app code (`send()`/`subscribe()` adapter).
3. Keep encryption in codec code so security remains transport-independent.
4. Prefer short-lived authenticated session keys/tokens for peer authorization.

## Notes

- This module only handles peer transport + request/response protocol.
- You still own how `pullChanges` / `pushChanges` are implemented on the serving peer.
- Do not enable plaintext mode in production.
