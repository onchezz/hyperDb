---
title: Peer Sync and Security
---

# Peer Sync and Security

HyperDB provides transport-agnostic peer sync helpers. You bring the channel; HyperDB provides protocol helpers.

## API surface

From `@onchezz/hyperdb/sync`:

- `createPeerSyncClient`
- `startPeerSyncServer`

## Design model

HyperDB does **not** force one transport stack. You can integrate:

- WebRTC data channels
- Bluetooth LE transport wrappers
- LAN socket transports
- App-specific encrypted tunnel transports

## Security defaults

HyperDB expects secure codec usage:

- `codec.encode`
- `codec.decode`

If codec is missing, unsafe plaintext mode should only be used in local development, never production.

## Minimum production security checklist

1. Authenticated encryption (AES-GCM/libsodium/Noise framework style approach).
2. Peer authorization on server side (`authorize`).
3. Session-scoped or short-lived credentials.
4. Replay mitigation strategy (nonce/counter/time window).
5. Explicit message size and schema validation.

## Example high-level flow

```text
Client discovers peer
-> transport session established
-> handshake/auth message
-> secure codec wraps payloads
-> pull/push sync exchange
-> ack + checkpoint
-> disconnect / keep-alive
```

## Responsibility split

HyperDB handles protocol helper logic around sync request/response flow.

Application handles:

- Channel setup and lifecycle
- Device discovery/pairing
- Key exchange and trust model
- Persisted identity and policy

## Failure handling guidance

- Retry with backoff on transient channel errors.
- Distinguish auth failure from transport failure.
- Log sync checkpoints and peer IDs for diagnostics.
- Keep sync idempotent where possible.
