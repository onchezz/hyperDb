---
title: Peer Sync and Security
---

# Peer Sync and Security

HyperTillDB peer sync is transport-agnostic. The app provides the transport and trust model.

## API surface

From `@onchez/hypertilldb/sync`:

- `createPeerSyncClient`
- `startPeerSyncServer`

## Why peer relay exists

When internet is unavailable, nearby devices can exchange updates locally and continue working.

When internet returns, those updates are flushed upstream.

## Transport options

- Web: WebRTC DataChannel
- Native: BLE/LAN wrappers
- Custom encrypted tunnel adapters

For nearby offline sync, include Wi-Fi hotspot/LAN transport adapters so one device can act as a temporary local hub.

## Required security controls

1. Mutual peer authentication.
2. Authenticated encryption for all payloads (AEAD).
3. Replay protection (nonce + monotonic counter + session id).
4. Schema version compatibility check.
5. Payload size and schema validation before apply.

## Recommended packet envelope

```ts
type SecureSyncPacket = {
  version: 1
  sessionId: string
  senderDeviceId: string
  sequence: number
  sentAt: number
  ciphertext: Uint8Array
  authTag: Uint8Array
}
```

## Suggested handshake

1. Device discovery
2. Capability exchange (schema version, sync protocol version)
3. Identity proof (signed challenge)
4. Session key establishment
5. Start encrypted sync streams

## Offline-to-online reconciliation

1. Receive peer deltas and apply locally with provenance metadata.
2. Mark entries as `source=peer` in oplog.
3. On internet restore, push unresolved entries to backend.
4. Backend conflict policy resolves canonical state.
5. Pull canonical changes and converge all peers.

Track sync state per record and per peer session:

- record status: `pending_peer`, `pending_server`, `synced`, `conflict`
- session checkpoint: `last_peer_ack_sequence`
- backend checkpoint: `last_server_cursor`

## Conflict policy recommendation

Use deterministic conflict behavior for peer-originated changes:

- domain fields: explicit policy per table
- system metadata fields: backend wins
- irreversible operations (delete/close/archive): guarded by policy checks

## Observability

Emit explicit events:

- `peer:connect:start`, `peer:connect:done`
- `peer:auth:failed`
- `peer:sync:delta:received`
- `peer:sync:delta:applied`
- `peer:sync:error`

Never log decrypted sensitive payload contents in production.

## Ditto-inspired operating principles

HyperTillDB should borrow proven distributed sync ideas while keeping backend ownership explicit:

- peer-first exchange when internet is unavailable
- resumable sessions with durable checkpoints
- explicit start/stop sync lifecycle

References:

- Ditto edge sync concepts: [docs.ditto.live](https://docs.ditto.live/home)
- Ditto FAQ on background/start-stop behavior: [docs.ditto.live/sdk/latest/faq](https://docs.ditto.live/sdk/latest/faq)
