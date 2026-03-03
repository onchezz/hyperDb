// @noflow

export type EventHandler = (payload: mixed) => void

export type HyperTillEvents = {
  emit: (eventName: string, payload?: mixed) => void,
  on: (eventName: string, handler: EventHandler) => () => void,
  off: (eventName: string, handler: EventHandler) => void,
  clear: () => void,
}

export const createEvents = (): HyperTillEvents => {
  const listeners: Map<string, Set<EventHandler>> = new Map()

  const emit = (eventName: string, payload?: mixed) => {
    const handlers = listeners.get(eventName)
    if (!handlers) {
      return
    }
    handlers.forEach((handler) => {
      handler(payload)
    })
  }

  const on = (eventName: string, handler: EventHandler): (() => void) => {
    let handlers = listeners.get(eventName)
    if (!handlers) {
      handlers = new Set()
      listeners.set(eventName, handlers)
    }
    handlers.add(handler)
    return () => {
      const current = listeners.get(eventName)
      if (!current) {
        return
      }
      current.delete(handler)
      if (!current.size) {
        listeners.delete(eventName)
      }
    }
  }

  const off = (eventName: string, handler: EventHandler): void => {
    const handlers = listeners.get(eventName)
    if (!handlers) {
      return
    }
    handlers.delete(handler)
    if (!handlers.size) {
      listeners.delete(eventName)
    }
  }

  const clear = (): void => {
    listeners.clear()
  }

  return {
    emit,
    on,
    off,
    clear,
  }
}
