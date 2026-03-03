// @flow

import { setGenerator as setRandomIdGenerator } from '../utils/common/randomId'

export type IdGenerator = () => string

const fallbackRandomBytes = (bytes: Uint8Array): void => {
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
}

const getRandomBytes = (): Uint8Array => {
  const bytes = new Uint8Array(16)
  const cryptoObject = (global: any).crypto
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    cryptoObject.getRandomValues(bytes)
  } else {
    fallbackRandomBytes(bytes)
  }
  return bytes
}

const byteToHex = (byte: number): string => byte.toString(16).padStart(2, '0')

const bytesToUuidV4 = (bytes: Uint8Array): string => {
  // RFC 9562 / UUIDv4 layout bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byteToHex).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const uuidv4 = (): string => {
  const cryptoObject = (global: any).crypto
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID()
  }
  return bytesToUuidV4(getRandomBytes())
}

export const setIdGenerator = (generator: IdGenerator): void => {
  setRandomIdGenerator(generator)
}

export const useUuidV4IdGenerator = (): void => {
  setIdGenerator(uuidv4)
}
