import {
  createPeerSyncClient,
  startPeerSyncServer,
  insecureJsonPeerSyncCodec,
} from './index'

const secureCodec = {
  encode: (message) => `secure:${Buffer.from(JSON.stringify(message), 'utf8').toString('base64')}`,
  decode: (encodedMessage) => {
    if (!encodedMessage.startsWith('secure:')) {
      throw new Error('Invalid secure payload')
    }
    const json = Buffer.from(encodedMessage.slice(7), 'base64').toString('utf8')
    return JSON.parse(json)
  },
}

const pullResult = {
  changes: {
    tasks: { created: [], updated: [], deleted: [] },
  },
  timestamp: 123,
}

const pushArgs = {
  changes: {
    tasks: { created: [], updated: [], deleted: [] },
  },
  lastPulledAt: 100,
}

const pullArgs = {
  lastPulledAt: null,
  schemaVersion: 1,
  migration: null,
}

const makePair = () => {
  let leftListener = null
  let rightListener = null

  const left = {
    send: (message) => Promise.resolve().then(() => rightListener && rightListener(message)),
    subscribe: (listener) => {
      leftListener = listener
      return () => {
        if (leftListener === listener) {
          leftListener = null
        }
      }
    },
  }

  const right = {
    send: (message) => Promise.resolve().then(() => leftListener && leftListener(message)),
    subscribe: (listener) => {
      rightListener = listener
      return () => {
        if (rightListener === listener) {
          rightListener = null
        }
      }
    },
  }

  return { left, right }
}

describe('sync/peer', () => {
  it('can perform secure pull/push calls over transport', async () => {
    const pair = makePair()
    const pullChanges = jest.fn(async () => pullResult)
    const pushChanges = jest.fn(async () => ({}))
    const server = startPeerSyncServer({
      transport: pair.right,
      codec: secureCodec,
      pullChanges,
      pushChanges,
      authorize: ({ authToken }) => {
        if (authToken !== 'peer-token') {
          const error = new Error('Unauthorized peer')
          error.code = 'unauthorized'
          throw error
        }
      },
    })

    const client = createPeerSyncClient({
      transport: pair.left,
      codec: secureCodec,
      authToken: 'peer-token',
    })

    expect(await client.pullChanges(pullArgs)).toEqual(pullResult)
    await client.pushChanges(pushArgs)

    expect(pullChanges).toHaveBeenCalledWith(pullArgs)
    expect(pushChanges).toHaveBeenCalledWith(pushArgs)

    client.close()
    server.stop()
  })

  it('rejects unauthorized requests', async () => {
    const pair = makePair()
    const server = startPeerSyncServer({
      transport: pair.right,
      codec: secureCodec,
      pullChanges: async () => pullResult,
      authorize: () => {
        const error = new Error('Unauthorized peer')
        error.code = 'unauthorized'
        throw error
      },
    })

    const client = createPeerSyncClient({
      transport: pair.left,
      codec: secureCodec,
      authToken: 'bad-token',
    })

    await expect(client.pullChanges(pullArgs)).rejects.toMatchObject({
      message: 'Unauthorized peer',
      code: 'unauthorized',
    })

    client.close()
    server.stop()
  })

  it('times out when peer does not respond', async () => {
    const pair = makePair()
    const client = createPeerSyncClient({
      transport: pair.left,
      codec: secureCodec,
      timeoutMs: 20,
    })

    await expect(client.pullChanges(pullArgs)).rejects.toThrow('timed out')
    client.close()
  })

  it('requires secure codec by default', async () => {
    const pair = makePair()
    expect(() =>
      startPeerSyncServer({
        transport: pair.right,
        pullChanges: async () => pullResult,
      }),
    ).toThrow('requires a secure codec')
    expect(() =>
      createPeerSyncClient({
        transport: pair.left,
      }),
    ).toThrow('requires a secure codec')
  })

  it('allows insecure JSON codec only when explicitly enabled', async () => {
    const pair = makePair()
    const server = startPeerSyncServer({
      transport: pair.right,
      pullChanges: async () => pullResult,
      unsafeAllowUnencryptedMessages: true,
    })
    const client = createPeerSyncClient({
      transport: pair.left,
      unsafeAllowUnencryptedMessages: true,
    })

    expect(insecureJsonPeerSyncCodec.decode(await insecureJsonPeerSyncCodec.encode(pullResult))).toEqual(
      pullResult,
    )
    expect(await client.pullChanges(pullArgs)).toEqual(pullResult)

    client.close()
    server.stop()
  })
})
