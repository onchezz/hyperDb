import type { SyncPullArgs, SyncPullResult, SyncPushArgs, SyncPushResult } from '..'

export type PeerSyncMethod = 'pullChanges' | 'pushChanges'

export type PeerSyncErrorPayload = {
  code: string
  message: string
}

export type PeerSyncRequest = {
  type: 'request'
  id: string
  method: PeerSyncMethod
  params: object
  authToken?: string
}

export type PeerSyncSuccessResponse = {
  type: 'response'
  id: string
  ok: true
  result: object
}

export type PeerSyncFailureResponse = {
  type: 'response'
  id: string
  ok: false
  error: PeerSyncErrorPayload
}

export type PeerSyncMessage = PeerSyncRequest | PeerSyncSuccessResponse | PeerSyncFailureResponse

export type PeerSyncTransport = {
  send: (encodedMessage: string) => Promise<void> | void
  subscribe: (listener: (encodedMessage: string) => Promise<void> | void) => (() => void) | void
}

export type PeerSyncCodec = {
  encode: (message: PeerSyncMessage) => Promise<string> | string
  decode: (encodedMessage: string) => Promise<PeerSyncMessage> | PeerSyncMessage
}

export const insecureJsonPeerSyncCodec: PeerSyncCodec

export type PeerSyncClient = {
  pullChanges: (args: SyncPullArgs) => Promise<SyncPullResult>
  pushChanges: (args: SyncPushArgs) => Promise<SyncPushResult | undefined | void>
  close: () => void
}

export type PeerSyncClientOptions = {
  transport: PeerSyncTransport
  codec?: PeerSyncCodec
  timeoutMs?: number
  authToken?: string
  unsafeAllowUnencryptedMessages?: boolean
}

export function createPeerSyncClient(options: PeerSyncClientOptions): PeerSyncClient

export type PeerSyncAuthorizeArgs = {
  method: PeerSyncMethod
  authToken?: string
}

export type PeerSyncServerOptions = {
  transport: PeerSyncTransport
  pullChanges: (args: SyncPullArgs) => Promise<SyncPullResult>
  pushChanges?: (args: SyncPushArgs) => Promise<SyncPushResult | undefined | void>
  codec?: PeerSyncCodec
  authorize?: (args: PeerSyncAuthorizeArgs) => Promise<void> | void
  onError?: (error: Error) => void
  unsafeAllowUnencryptedMessages?: boolean
}

export type PeerSyncServer = {
  stop: () => void
}

export function startPeerSyncServer(options: PeerSyncServerOptions): PeerSyncServer
