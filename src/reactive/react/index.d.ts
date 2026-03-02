import type { ReactNode } from 'react'
import type { ReactiveTableQuery } from '..'

export type ReactiveHookState<T> = {
  data: T | null
  error: Error | null
  isLoading: boolean
}

export function useReactiveQuery<Row extends Record<string, any> = Record<string, any>>(
  buildQuery: () => ReactiveTableQuery<Row>,
  deps?: ReadonlyArray<any>,
): ReactiveHookState<Row[]>

export function useReactiveSingle<Row extends Record<string, any> = Record<string, any>>(
  buildQuery: () => ReactiveTableQuery<Row>,
  deps?: ReadonlyArray<any>,
): ReactiveHookState<Row | null>

export type ReactiveQueryProps<Row extends Record<string, any> = Record<string, any>> = {
  buildQuery: () => ReactiveTableQuery<Row>
  deps?: ReadonlyArray<any>
  children: (state: ReactiveHookState<Row[]>) => ReactNode
}

export function ReactiveQuery<Row extends Record<string, any> = Record<string, any>>(
  props: ReactiveQueryProps<Row>,
): JSX.Element
