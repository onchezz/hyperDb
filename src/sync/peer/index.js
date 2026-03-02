// @flow

import { invariant } from '../../utils/common'

import type { SyncPullArgs, SyncPullResult, SyncPushArgs, SyncPushResult } from '..'

type PeerSyncMethod = 'pullChanges' | 'pushChanges'

type PeerSyncErrorPayload = $Exact<{
  code: string,
  message: string,
}>

type PeerSyncRequest = $Exact<{
  type: 'request',
  id: string,
  method: PeerSyncMethod,
  params: Object,
  authToken?: string,
}>

type PeerSyncSuccessResponse = $Exact<{
  type: 'response',
  id: string,
  ok: true,
  result: Object,
}>

type PeerSyncFailureResponse = $Exact<{
  type: 'response',
  id: string,
  ok: false,
  error: PeerSyncErrorPayload,
}>

export type PeerSyncMessage = PeerSyncRequest | PeerSyncSuccessResponse | PeerSyncFailureResponse

type MessageListener = (encodedMessage: string) => Promise<void> | void
export type PeerSyncTransport = $Exact<{
  send: (encodedMessage: string) => Promise<void> | void,
  subscribe: (listener: MessageListener) => (() => void) | void,
}>

export type PeerSyncCodec = $Exact<{
  encode: (message: PeerSyncMessage) => Promise<string> | string,
  decode: (encodedMessage: string) => Promise<PeerSyncMessage> | PeerSyncMessage,
}>

export const insecureJsonPeerSyncCodec: PeerSyncCodec = {
  encode: (message: PeerSyncMessage): string => JSON.stringify(message),
  decode: (encodedMessage: string): PeerSyncMessage => JSON.parse(encodedMessage),
}

const defaultTimeoutMs = 30000
let requestCounter = 0

function isObject(value: any): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isPeerSyncRequest(message: any): boolean {
  return (
    isObject(message) &&
    message.type === 'request' &&
    typeof message.id === 'string' &&
    ['pullChanges', 'pushChanges'].includes(message.method) &&
    isObject(message.params)
  )
}

function isPeerSyncResponse(message: any): boolean {
  if (!isObject(message) || message.type !== 'response' || typeof message.id !== 'string') {
    return false
  }

  if (message.ok === true) {
    return isObject(message.result)
  }
  if (message.ok === false) {
    return (
      isObject(message.error) &&
      typeof message.error.code === 'string' &&
      typeof message.error.message === 'string'
    )
  }
  return false
}

function serializeError(error: Error): PeerSyncErrorPayload {
  const anyError: any = error
  return {
    code: typeof anyError.code === 'string' ? anyError.code : 'peer_sync_error',
    message: error.message || 'Peer sync request failed',
  }
}

function toError(payload: PeerSyncErrorPayload): Error {
  const error: any = new Error(payload.message)
  error.code = payload.code
  return error
}

function resolveCodec(codec: ?PeerSyncCodec, unsafeAllowUnencryptedMessages: boolean): PeerSyncCodec {
  if (codec) {
    return codec
  }

  invariant(
    unsafeAllowUnencryptedMessages,
    '[Sync] Peer sync requires a secure codec. Pass `codec` (recommended) or explicitly set `unsafeAllowUnencryptedMessages: true` for development only.',
  )
  return insecureJsonPeerSyncCodec
}

function nextRequestId(): string {
  requestCounter += 1
  return `${Date.now()}-${requestCounter}`
}

type PendingRequest = $Exact<{
  resolve: (value: Object) => void,
  reject: (error: Error) => void,
  timeoutId: TimeoutID,
}>

export type PeerSyncClient = $Exact<{
  pullChanges: (args: SyncPullArgs) => Promise<SyncPullResult>,
  pushChanges: (args: SyncPushArgs) => Promise<?SyncPushResult>,
  close: () => void,
}>

export type PeerSyncClientOptions = $Exact<{
  transport: PeerSyncTransport,
  codec?: PeerSyncCodec,
  timeoutMs?: number,
  authToken?: string,
  unsafeAllowUnencryptedMessages?: boolean,
}>

export function createPeerSyncClient({
  transport,
  codec,
  timeoutMs = defaultTimeoutMs,
  authToken,
  unsafeAllowUnencryptedMessages = false,
}: PeerSyncClientOptions): PeerSyncClient {
  const resolvedCodec = resolveCodec(codec, unsafeAllowUnencryptedMessages)
  const pendingRequests: Map<string, PendingRequest> = new Map()
  let closed = false

  const clearRequest = (requestId: string): ?PendingRequest => {
    const pending = pendingRequests.get(requestId)
    if (!pending) {
      return null
    }
    clearTimeout(pending.timeoutId)
    pendingRequests.delete(requestId)
    return pending
  }

  const rejectAllRequests = (error: Error) => {
    pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeoutId)
      pending.reject(error)
    })
    pendingRequests.clear()
  }

  const onMessage = async (encodedMessage: string) => {
    let message
    try {
      message = await resolvedCodec.decode(encodedMessage)
    } catch (decodeError) {
      rejectAllRequests(new Error('[Sync] Failed to decode peer sync response'))
      return
    }

    if (!isPeerSyncResponse(message)) {
      return
    }
    const responseMessage: PeerSyncSuccessResponse | PeerSyncFailureResponse = (message: any)

    const pending = clearRequest(responseMessage.id)
    if (!pending) {
      return
    }

    if (responseMessage.ok) {
      pending.resolve(responseMessage.result)
    } else {
      pending.reject(toError(responseMessage.error))
    }
  }

  const unsubscribe = transport.subscribe(onMessage)

  const sendRequest = async (method: PeerSyncMethod, params: Object): Promise<Object> => {
    invariant(!closed, '[Sync] Peer sync client has been closed')
    const requestId = nextRequestId()
    const request: PeerSyncRequest = { type: 'request', id: requestId, method, params }
    if (authToken) {
      request.authToken = authToken
    }

    const responsePromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingRequests.delete(requestId)
        reject(new Error(`[Sync] Peer sync request timed out after ${timeoutMs}ms (${method})`))
      }, timeoutMs)
      pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      })
    })

    let encodedRequest
    try {
      encodedRequest = await resolvedCodec.encode(request)
    } catch (encodeError) {
      const pending = clearRequest(requestId)
      pending && pending.reject(new Error('[Sync] Failed to encode peer sync request'))
      throw encodeError
    }

    try {
      await transport.send(encodedRequest)
    } catch (sendError) {
      const pending = clearRequest(requestId)
      pending && pending.reject(sendError)
    }

    return responsePromise
  }

  const close = () => {
    if (closed) {
      return
    }
    closed = true
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
    rejectAllRequests(new Error('[Sync] Peer sync client was closed'))
  }

  return {
    pullChanges: (args: SyncPullArgs): Promise<SyncPullResult> =>
      ((sendRequest('pullChanges', args): any): Promise<SyncPullResult>),
    pushChanges: (args: SyncPushArgs): Promise<?SyncPushResult> =>
      ((sendRequest('pushChanges', args): any): Promise<?SyncPushResult>),
    close,
  }
}

export type PeerSyncAuthorizeArgs = $Exact<{
  method: PeerSyncMethod,
  authToken?: string,
}>

export type PeerSyncServerOptions = $Exact<{
  transport: PeerSyncTransport,
  pullChanges: (args: SyncPullArgs) => Promise<SyncPullResult>,
  pushChanges?: (args: SyncPushArgs) => Promise<?SyncPushResult>,
  codec?: PeerSyncCodec,
  authorize?: (args: PeerSyncAuthorizeArgs) => Promise<void> | void,
  onError?: (error: Error) => void,
  unsafeAllowUnencryptedMessages?: boolean,
}>

export type PeerSyncServer = $Exact<{ stop: () => void }>

export function startPeerSyncServer({
  transport,
  pullChanges,
  pushChanges,
  codec,
  authorize,
  onError,
  unsafeAllowUnencryptedMessages = false,
}: PeerSyncServerOptions): PeerSyncServer {
  const resolvedCodec = resolveCodec(codec, unsafeAllowUnencryptedMessages)
  const pushHandler: (args: SyncPushArgs) => Promise<?SyncPushResult> =
    pushChanges || (async (_args: SyncPushArgs) => ({}))

  const listener = async (encodedMessage: string) => {
    let message
    try {
      message = await resolvedCodec.decode(encodedMessage)
    } catch (decodeError) {
      onError && onError(new Error('[Sync] Failed to decode peer sync request'))
      return
    }

    if (!isPeerSyncRequest(message)) {
      return
    }
    const requestMessage: PeerSyncRequest = (message: any)

    let response: PeerSyncSuccessResponse | PeerSyncFailureResponse
    try {
      if (authorize) {
        await authorize({ method: requestMessage.method, authToken: requestMessage.authToken })
      }
      const result =
        requestMessage.method === 'pullChanges'
          ? await pullChanges((requestMessage.params: any))
          : await pushHandler((requestMessage.params: any))
      response = { type: 'response', id: requestMessage.id, ok: true, result: result || {} }
    } catch (requestError) {
      response = {
        type: 'response',
        id: requestMessage.id,
        ok: false,
        error: serializeError((requestError: any)),
      }
      onError && onError((requestError: any))
    }

    try {
      const encodedResponse = await resolvedCodec.encode(response)
      await transport.send(encodedResponse)
    } catch (sendError) {
      onError && onError((sendError: any))
    }
  }

  const unsubscribe = transport.subscribe(listener)
  return {
    stop: () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    },
  }
}
