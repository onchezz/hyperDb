// @noflow

import { useReactiveQuery, useReactiveSingle } from '../reactive/react'

type QueryOperator =
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte', value: mixed }
  | { op: 'in', value: mixed[] }

type QueryConfig = {
  select?: string[] | string,
  where?: { [string]: mixed | QueryOperator },
  orderBy?: { column: string, ascending?: boolean } | string,
  limit?: number,
  range?: [number, number],
}

const stableStringify = (value: mixed): string => {
  if (value === null || value === undefined) {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (typeof value === 'object') {
    // $FlowFixMe[incompatible-type]
    const entries = Object.keys(value).sort().map((key) => `${key}:${stableStringify(value[key])}`)
    return `{${entries.join(',')}}`
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  return String(value)
}

const applyWhere = (query: any, where: { [string]: mixed | QueryOperator } = {}): any => {
  return Object.keys(where).reduce((nextQuery, column) => {
    const descriptor = where[column]

    if (descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor) && descriptor.op) {
      switch (descriptor.op) {
        case 'eq':
          return nextQuery.eq(column, descriptor.value)
        case 'neq':
          return nextQuery.neq(column, descriptor.value)
        case 'gt':
          return nextQuery.gt(column, descriptor.value)
        case 'gte':
          return nextQuery.gte(column, descriptor.value)
        case 'lt':
          return nextQuery.lt(column, descriptor.value)
        case 'lte':
          return nextQuery.lte(column, descriptor.value)
        case 'in':
          return nextQuery.in(column, descriptor.value)
        default:
          return nextQuery.eq(column, descriptor)
      }
    }

    return nextQuery.eq(column, descriptor)
  }, query)
}

export const applyQueryConfig = (query: any, config: QueryConfig = {}): any => {
  let nextQuery = query

  if (config.select) {
    nextQuery = nextQuery.select(config.select)
  }

  if (config.where) {
    nextQuery = applyWhere(nextQuery, config.where)
  }

  if (config.orderBy) {
    const sort = typeof config.orderBy === 'string'
      ? { column: config.orderBy, ascending: true }
      : config.orderBy
    nextQuery = nextQuery.order(sort.column, { ascending: sort.ascending !== false })
  }

  if (typeof config.limit === 'number') {
    nextQuery = nextQuery.limit(config.limit)
  }

  if (config.range && Array.isArray(config.range) && config.range.length === 2) {
    nextQuery = nextQuery.range(config.range[0], config.range[1])
  }

  return nextQuery
}

export const buildUseList = (reactive: any, table: string) =>
  (config: QueryConfig = {}, deps: mixed[] = []) => {
    const fingerprint = stableStringify(config)
    return useReactiveQuery(
      () => applyQueryConfig(reactive.from(table), config),
      [fingerprint, ...deps],
    )
  }

export const buildUseById = (reactive: any, table: string) =>
  (id: string, deps: mixed[] = []) =>
    useReactiveSingle(
      () => reactive.from(table).eq('id', id).limit(1),
      [id, ...deps],
    )

export const buildUseByColumn = (reactive: any, table: string, column: string) =>
  (value: mixed, deps: mixed[] = [], config: QueryConfig = {}) =>
    useReactiveQuery(
      () => {
        const next = {
          ...config,
          where: {
            ...(config.where || {}),
            [column]: value,
          },
        }
        return applyQueryConfig(reactive.from(table), next)
      },
      [column, value, stableStringify(config), ...deps],
    )
