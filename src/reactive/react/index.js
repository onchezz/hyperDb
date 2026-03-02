// @flow

import * as React from 'react'

import type { ReactiveTableQuery } from '..'

export type ReactiveHookState<T> = $Exact<{
  data: ?T,
  error: ?Error,
  isLoading: boolean,
}>

const initialState = <T>(): ReactiveHookState<T> => ({
  data: null,
  error: null,
  isLoading: true,
})

export function useReactiveQuery<Row: { [string]: any }>(
  buildQuery: () => ReactiveTableQuery,
  deps: $ReadOnlyArray<mixed> = [],
): ReactiveHookState<Row[]> {
  const [state, setState] = React.useState<ReactiveHookState<Row[]>>(initialState())

  // deps are explicitly provided by the caller to control query resubscription.
  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(() => {
    let isActive = true
    let unsubscribe = () => {}
    setState(initialState())

    try {
      const query = buildQuery()
      const subscription = query.observe().subscribe(
        (response) => {
          if (!isActive) {
            return
          }
          setState({
            data: (response.data: any),
            error: response.error,
            isLoading: false,
          })
        },
        (error) => {
          if (!isActive) {
            return
          }
          setState({
            data: null,
            error,
            isLoading: false,
          })
        },
      )
      unsubscribe = () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      setState({
        data: null,
        error: (error: any),
        isLoading: false,
      })
    }

    return () => {
      isActive = false
      unsubscribe()
    }
  }, deps)
  /* eslint-enable react-hooks/exhaustive-deps */

  return state
}

export function useReactiveSingle<Row: { [string]: any }>(
  buildQuery: () => ReactiveTableQuery,
  deps: $ReadOnlyArray<mixed> = [],
): ReactiveHookState<?Row> {
  const rowsState = useReactiveQuery<Row>(buildQuery, deps)
  if (rowsState.error || rowsState.isLoading) {
    return {
      data: null,
      error: rowsState.error,
      isLoading: rowsState.isLoading,
    }
  }

  const rows = rowsState.data || []
  if (rows.length > 1) {
    return {
      data: null,
      error: new Error(`[Reactive] useReactiveSingle expected <= 1 row, but got ${rows.length}`),
      isLoading: false,
    }
  }

  return {
    data: rows[0] || null,
    error: null,
    isLoading: false,
  }
}

type ReactiveQueryProps<Row: { [string]: any }> = $Exact<{
  buildQuery: () => ReactiveTableQuery,
  deps?: $ReadOnlyArray<mixed>,
  children: (state: ReactiveHookState<Row[]>) => React$Node,
}>

export function ReactiveQuery<Row: { [string]: any }>({
  buildQuery,
  deps = [],
  children,
}: ReactiveQueryProps<Row>): React$Node {
  const state = useReactiveQuery<Row>(buildQuery, deps)
  return children(state)
}
