// @noflow

import { Database, Model, appSchema, tableSchema } from '../core'
import SQLiteAdapter from '../adapters/sqlite'
import LokiJSAdapter from '../adapters/lokijs'
import { createHyperTill } from '../runtime/createHyperTill'
import { normalizeModels } from '../modeling'
import { defineModels, isDefinedModels } from './defineModels'

type MutationStatus = 'success' | 'error'

export type MutationProgress = {
  current: number,
  total: number,
  percent: number,
}

export type MutationResult<T> = {
  data: ?T,
  error: ?Error,
  loading: false,
  status: MutationStatus,
  progress: MutationProgress,
}

export type CreateDBOptions = {
  name?: string,
  database?: any,
  models: any,
  schemaVersion?: number,
  platform?: 'auto' | 'native' | 'web',
  native?: {
    dbName?: string,
    jsi?: boolean,
    onSetUpError?: (error: mixed) => void,
  },
  web?: {
    dbName?: string,
    useWebWorker?: boolean,
    useIncrementalIndexedDB?: boolean,
    onSetUpError?: (error: Error) => void,
  },
  reactiveOptions?: { idGenerator?: () => string },
}

type MutationMode = 'soft' | 'hard'

const DEFAULT_DB_NAME = 'hypertill'
const DEFAULT_WEB_DB_NAME = 'hypertill_web'

const toPlural = (value: string): string => (value.endsWith('s') ? value : `${value}s`)

const normalizeError = (value: mixed): Error => {
  if (value instanceof Error) {
    return value
  }
  return new Error(String(value))
}

const buildProgress = (current: number, total: number): MutationProgress => ({
  current,
  total,
  percent: total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 100,
})

const successMutation = <T>(data: ?T, total: number, current: number): MutationResult<T> => ({
  data,
  error: null,
  loading: false,
  status: 'success',
  progress: buildProgress(current, total),
})

const errorMutation = <T>(error: mixed, total: number): MutationResult<T> => ({
  data: null,
  error: normalizeError(error),
  loading: false,
  status: 'error',
  progress: buildProgress(0, total),
})

const applyCreateSystemFields = (row: { [string]: mixed }, timestamps: boolean): { [string]: mixed } => {
  if (!timestamps) {
    return { ...row }
  }

  const now = Date.now()
  const next = { ...row }
  if (typeof next.created_at !== 'number') {
    next.created_at = now
  }
  if (typeof next.updated_at !== 'number') {
    next.updated_at = now
  }
  if (!Object.prototype.hasOwnProperty.call(next, 'deleted_at')) {
    next.deleted_at = null
  }
  return next
}

const applyUpdateSystemFields = (row: { [string]: mixed }, timestamps: boolean): { [string]: mixed } => {
  if (!timestamps) {
    return { ...row }
  }

  const next = { ...row }
  if (typeof next.updated_at !== 'number') {
    next.updated_at = Date.now()
  }
  return next
}

const firstOrNull = <T>(rows: ?T[]): ?T => (rows && rows.length ? rows[0] : null)

const buildSoftDeletePayload = (timestamps: boolean): { [string]: mixed } => {
  const now = Date.now()
  if (!timestamps) {
    return { deleted_at: now }
  }
  return {
    deleted_at: now,
    updated_at: now,
  }
}

const isWebRuntime = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined'

const toCamelCase = (value: string): string =>
  value.replace(/_([a-z])/g, (_match, group) => group.toUpperCase())

const createModelClass = (table: string): Class<Model> => {
  class HyperTillDynamicModel extends Model {}
  HyperTillDynamicModel.table = table
  return HyperTillDynamicModel
}

const toStorageColumnType = (kind: string): 'string' | 'number' | 'boolean' => {
  if (kind === 'number' || kind === 'boolean') {
    return kind
  }
  // JSON + relation foreign keys are persisted as strings.
  return 'string'
}

const buildDefinedModelsFromSchemaModels = (schemaModels: any[]): any => {
  const normalized = normalizeModels(schemaModels)
  const byTable = normalized.reduce((acc, modelDef) => {
    acc[modelDef.table] = modelDef
    return acc
  }, {})

  const entries = normalized.map((modelDef) => {
    const relations = modelDef.fields
      .filter((field) => field.kind === 'relation')
      .map((field) => {
        const target = byTable[String(field.relationTable || '')]
        const foreignKey = field.columnName
        return {
          targetName: target ? target.name : toCamelCase(String(field.relationTable || '')),
          targetTable: String(field.relationTable || ''),
          foreignKey,
          fieldName: toCamelCase(foreignKey),
          indexed: field.indexed !== false,
          optional: field.optional === true,
        }
      })

    const columns = modelDef.fields
      .filter((field) => field.kind !== 'relation')
      .reduce((acc, field) => {
        acc[field.columnName] = {
          type: field.kind,
          indexed: field.indexed === true,
          optional: field.optional === true,
        }
        return acc
      }, {})

    return {
      name: modelDef.name,
      table: modelDef.table,
      deleteMode: 'soft',
      timestamps: true,
      columns,
      relations,
    }
  })

  const entriesByName = entries.reduce((acc, entry) => {
    acc[entry.name] = entry
    return acc
  }, {})
  const entriesByTable = entries.reduce((acc, entry) => {
    acc[entry.table] = entry
    return acc
  }, {})

  return Object.freeze({
    __hypertillDefinedModels: true,
    entries: Object.freeze(entries),
    models: Object.freeze(normalized),
    byName: Object.freeze(entriesByName),
    byTable: Object.freeze(entriesByTable),
  })
}

const buildColumnsForEntry = (entry: any): any[] => {
  const mergedColumns = {
    ...(entry.columns || {}),
  }

  entry.relations.forEach((relation) => {
    if (!mergedColumns[relation.foreignKey]) {
      mergedColumns[relation.foreignKey] = {
        type: 'string',
        indexed: relation.indexed !== false,
        optional: relation.optional === true,
      }
    }
  })

  if (entry.timestamps) {
    if (!mergedColumns.created_at) {
      mergedColumns.created_at = { type: 'number', indexed: true, optional: false }
    }
    if (!mergedColumns.updated_at) {
      mergedColumns.updated_at = { type: 'number', indexed: true, optional: false }
    }
    if (!mergedColumns.deleted_at) {
      mergedColumns.deleted_at = { type: 'number', indexed: true, optional: true }
    }
  }

  const columnNames = Object.keys(mergedColumns)
  if (!columnNames.length) {
    throw new Error(
      `[HyperTillDB] Cannot infer runtime columns for model '${entry.name}'. For dbModel<T>(), pass an explicit database for now.`,
    )
  }

  return columnNames.map((columnName) => {
    const column = mergedColumns[columnName]
    return {
      name: columnName,
      type: toStorageColumnType(column.type || 'string'),
      isIndexed: column.indexed === true,
      isOptional: column.optional === true,
    }
  })
}

const bootstrapDatabase = ({
  name,
  database,
  definedModels,
  schemaVersion = 1,
  platform = 'auto',
  native = {},
  web = {},
}): { database: any, schema: any | null } => {
  if (database) {
    return { database, schema: null }
  }

  const schema = appSchema({
    version: schemaVersion,
    tables: definedModels.entries.map((entry) =>
      tableSchema({
        name: entry.table,
        columns: buildColumnsForEntry(entry),
      }),
    ),
  })

  const modelClasses = definedModels.entries.map((entry) => createModelClass(entry.table))
  const useWebAdapter = platform === 'web' || (platform === 'auto' && isWebRuntime())

  const adapter = useWebAdapter
    ? new LokiJSAdapter({
        schema,
        dbName: web.dbName || `${name || DEFAULT_WEB_DB_NAME}`,
        useWebWorker: web.useWebWorker === true,
        useIncrementalIndexedDB: web.useIncrementalIndexedDB !== false,
        onSetUpError: web.onSetUpError,
      })
    : new SQLiteAdapter({
        schema,
        dbName: native.dbName || name || DEFAULT_DB_NAME,
        jsi: native.jsi !== false,
        onSetUpError: native.onSetUpError,
      })

  return {
    database: new Database({
      adapter,
      modelClasses,
    }),
    schema,
  }
}

const buildModelApi = (baseApi: any, entry: any): any => {
  const baseCreate = baseApi.create.bind(baseApi)
  const baseCreateMany = baseApi.createMany.bind(baseApi)
  const baseUpdate = baseApi.update.bind(baseApi)
  const baseDelete = baseApi.delete.bind(baseApi)
  const baseUpsert = baseApi.upsert.bind(baseApi)

  const wrapResponse = (response: any, total: number): MutationResult<any> => {
    if (!response) {
      return errorMutation(new Error(`[HyperTillDB] Empty mutation response`), total)
    }
    if (response.error) {
      return errorMutation(response.error, total)
    }
    const rows = response.data || []
    const data = total === 1 ? firstOrNull(rows) : rows
    return successMutation(data, total, rows.length)
  }

  return {
    ...baseApi,
    create: async (values: { [string]: mixed }): Promise<MutationResult<any>> => {
      try {
        const payload = applyCreateSystemFields(values, entry.timestamps)
        const response = await baseCreate(payload)
        return wrapResponse(response, 1)
      } catch (error) {
        return errorMutation(error, 1)
      }
    },
    createMany: async (values: { [string]: mixed }[]): Promise<MutationResult<any[]>> => {
      try {
        const payload = values.map((item) => applyCreateSystemFields(item, entry.timestamps))
        const response = await baseCreateMany(payload)
        return wrapResponse(response, payload.length)
      } catch (error) {
        return errorMutation(error, values.length)
      }
    },
    update: async (id: string, values: { [string]: mixed }): Promise<MutationResult<any>> => {
      try {
        const payload = applyUpdateSystemFields(values, entry.timestamps)
        const response = await baseUpdate(id, payload)
        return wrapResponse(response, 1)
      } catch (error) {
        return errorMutation(error, 1)
      }
    },
    delete: async (
      id: string,
      options: { mode?: MutationMode } = {},
    ): Promise<MutationResult<any>> => {
      const mode = options.mode || entry.deleteMode
      try {
        if (mode === 'soft') {
          const response = await baseUpdate(id, buildSoftDeletePayload(entry.timestamps))
          return wrapResponse(response, 1)
        }
        const response = await baseDelete(id)
        return wrapResponse(response, 1)
      } catch (error) {
        return errorMutation(error, 1)
      }
    },
    upsert: async (values: { [string]: mixed } | { [string]: mixed }[], options?: mixed): Promise<MutationResult<any[]>> => {
      const rows = Array.isArray(values) ? values : [values]
      try {
        const payload = rows.map((row) => applyCreateSystemFields(row, entry.timestamps))
        const response = await baseUpsert(payload, options)
        return wrapResponse(response, payload.length)
      } catch (error) {
        return errorMutation(error, rows.length)
      }
    },
  }
}

const injectRootHooks = (client: any, entry: any): void => {
  const modelApi = client[entry.table]
  const plural = toPlural(entry.name)
  const useListHookName = `use${plural}`
  const useByIdHookName = `use${entry.name}ById`

  client[useListHookName] = (config?: any, deps?: mixed[]) => modelApi.useList(config, deps)
  client[useByIdHookName] = (id: string, deps?: mixed[]) => modelApi.useById(id, deps)

  entry.relations.forEach((rel) => {
    const relationHookName = `use${plural}By${rel.targetName}Id`
    const modelHookName = `useBy${rel.targetName}Id`
    const hook = (targetId: string, config: any = {}, deps: mixed[] = []) => {
      const where = {
        ...(config.where || {}),
        [rel.foreignKey]: targetId,
      }
      return modelApi.useList(
        {
          ...config,
          where,
        },
        deps,
      )
    }
    client[relationHookName] = hook
    modelApi[modelHookName] = hook
  })
}

export const createDB = ({
  name,
  database,
  models,
  schemaVersion = 1,
  platform = 'auto',
  native = {},
  web = {},
  reactiveOptions = {},
}: CreateDBOptions): any => {
  const usesSchemaModels = Array.isArray(models)
  const definedModels = isDefinedModels(models)
    ? models
    : usesSchemaModels
      ? buildDefinedModelsFromSchemaModels(models)
      : defineModels(models)

  if (!database && !usesSchemaModels) {
    throw new Error(
      `[HyperTillDB] createDB() requires { database } when using dbModel()/defineModels(). ` +
        `For zero-config runtime bootstrap, pass schema models: createDB({ models: [defineModel(...)] }).`,
    )
  }

  const runtime = bootstrapDatabase({
    name,
    database,
    definedModels,
    schemaVersion,
    platform,
    native,
    web,
  })

  const baseClient = createHyperTill({
    database: runtime.database,
    models: definedModels.models,
    reactiveOptions,
  })

  const client: { [string]: any } = {
    name: name || null,
    database: runtime.database,
    schema: runtime.schema,
    reactive: baseClient.reactive,
    events: baseClient.events,
    models: definedModels.models,
    registry: definedModels,
    getModel: baseClient.getModel.bind(baseClient),
  }

  definedModels.entries.forEach((entry) => {
    const baseApi = baseClient[entry.table]
    const wrappedApi = buildModelApi(baseApi, entry)
    client[entry.table] = wrappedApi
    injectRootHooks(client, entry)
  })

  return client
}
