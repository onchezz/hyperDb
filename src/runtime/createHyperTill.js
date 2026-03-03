// @noflow

import { createReactiveClient } from '../reactive'
import { normalizeModels, toSnakeCase } from '../modeling'
import { buildUseList, buildUseByColumn, buildUseById, applyQueryConfig } from './hooks'
import { createEvents } from './events'

type QueryConfig = {
  select?: string[] | string,
  where?: { [string]: mixed },
  orderBy?: { column: string, ascending?: boolean } | string,
  limit?: number,
  range?: [number, number],
}

export type HyperTillOptions = {
  database: any,
  models: any[],
  reactiveOptions?: { idGenerator?: () => string },
}

const toPascalCase = (value: string): string =>
  value
    .replace(/[-_\s]+(.)?/g, (_m, g) => (g ? g.toUpperCase() : ''))
    .replace(/^(.)/, (g) => g.toUpperCase())

const buildModelApi = (reactive: any, model: any): any => {
  const table = model.table
  const useList = buildUseList(reactive, table)
  const useById = buildUseById(reactive, table)

  const api: { [string]: any } = {
    table,
    model,
    query: (config?: QueryConfig) => applyQueryConfig(reactive.from(table), config || {}),
    fetch: (config?: QueryConfig) => applyQueryConfig(reactive.from(table), config || {}).fetch(),
    subscribe: (config: QueryConfig, listener: (payload: any) => void) =>
      applyQueryConfig(reactive.from(table), config || {}).subscribe(listener),
    create: (values: { [string]: mixed }) => reactive.from(table).insert(values),
    createMany: (values: { [string]: mixed }[]) => reactive.from(table).insert(values),
    update: (id: string, values: { [string]: mixed }) =>
      reactive.from(table).eq('id', id).update(values),
    patch: (where: { [string]: mixed }, values: { [string]: mixed }) =>
      applyQueryConfig(reactive.from(table), { where }).update(values),
    remove: (where: { [string]: mixed }) => applyQueryConfig(reactive.from(table), { where }).delete(),
    delete: (id: string) => reactive.from(table).eq('id', id).delete(),
    upsert: (values: { [string]: mixed } | { [string]: mixed }[], options?: mixed) =>
      reactive.from(table).upsert(values, options),
    useList,
    useById,
  }

  model.fields
    .filter((field) => field.kind === 'relation')
    .forEach((relationField) => {
      const hookName = `useBy${toPascalCase(relationField.name)}`
      api[hookName] = buildUseByColumn(reactive, table, relationField.columnName)
    })

  return api
}

export const createHyperTill = ({
  database,
  models,
  reactiveOptions = {},
}: HyperTillOptions): any => {
  const normalizedModels = normalizeModels(models)
  const reactive = createReactiveClient(database, reactiveOptions)
  const events = createEvents()

  const db: { [string]: any } = {
    reactive,
    events,
    models: normalizedModels,
  }

  normalizedModels.forEach((model) => {
    db[model.table] = buildModelApi(reactive, model)
  })

  // Named helper to keep API ergonomic: db.books, db.chapters, db.notes.
  db.getModel = (tableOrName: string): any => {
    if (db[tableOrName]) {
      return db[tableOrName]
    }

    const snake = toSnakeCase(tableOrName)
    return db[snake]
  }

  return db
}
