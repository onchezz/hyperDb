// @noflow

import { Database, Model, appSchema, tableSchema } from '../core'
import SQLiteAdapter from '../adapters/sqlite'
import LokiJSAdapter from '../adapters/lokijs'
import { createHyperTill } from '../runtime/createHyperTill'
import { normalizeModels } from '../modeling'
import {
  createSchemaSnapshot,
  formatMigrationBlockedError,
  planSchemaMigration,
} from './migrations'
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
  migration?: {
    mode?: 'strict' | 'smart',
    autoDefaults?: boolean,
    detectRename?: 'none' | 'same-type-one-to-one',
    renameMap?: {
      [string]: {
        [string]: string,
      },
    },
    previousSnapshot?: {
      schemaVersion: number,
      generatedAt: string,
      tables: Array<{
        table: string,
        columns: Array<{
          name: string,
          type: 'string' | 'number' | 'boolean',
          isIndexed: boolean,
          isOptional: boolean,
        }>,
      }>,
    },
    onSnapshot?: (snapshot: mixed) => void,
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

const buildFieldMaps = (model: any): {
  appToStorage: { [string]: string },
  storageToApp: { [string]: string },
} => {
  const appToStorage = {}
  const storageToApp = {}
  ;(model?.fields || []).forEach((field) => {
    if (!field || !field.name || !field.columnName) {
      return
    }
    appToStorage[field.name] = field.columnName
    storageToApp[field.columnName] = field.name
  })
  return { appToStorage, storageToApp }
}

const mapRowToStorage = (row: { [string]: mixed }, appToStorage: { [string]: string }): { [string]: mixed } =>
  Object.keys(row || {}).reduce((acc, key) => {
    const storageKey = appToStorage[key] || key
    acc[storageKey] = row[key]
    return acc
  }, {})

const mapRowToApp = (row: { [string]: mixed }, storageToApp: { [string]: string }): { [string]: mixed } =>
  Object.keys(row || {}).reduce((acc, key) => {
    const appKey = storageToApp[key] || key
    acc[appKey] = row[key]
    return acc
  }, {})

const mapRowsToApp = (rows: any[] = [], storageToApp: { [string]: string }): any[] =>
  rows.map((row) => mapRowToApp(row, storageToApp))

const mapQueryConfigToStorage = (config: any, appToStorage: { [string]: string }): any => {
  if (!config) {
    return config
  }

  const mapped = { ...config }
  if (mapped.where && typeof mapped.where === 'object') {
    mapped.where = Object.keys(mapped.where).reduce((acc, key) => {
      acc[appToStorage[key] || key] = mapped.where[key]
      return acc
    }, {})
  }

  if (mapped.orderBy && typeof mapped.orderBy === 'object' && mapped.orderBy.column) {
    mapped.orderBy = {
      ...mapped.orderBy,
      column: appToStorage[mapped.orderBy.column] || mapped.orderBy.column,
    }
  }

  if (Array.isArray(mapped.select)) {
    mapped.select = mapped.select.map((item) => appToStorage[item] || item)
  }

  return mapped
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

const createSchemaTablesFromEntries = (entries: any[]): any[] =>
  entries.map((entry) => ({
    table: entry.table,
    columns: buildColumnsForEntry(entry).map((column) => ({
      name: column.name,
      type: column.type,
      isIndexed: column.isIndexed === true,
      isOptional: column.isOptional === true,
    })),
  }))

const canAutoBootstrapFromDefinedModels = (entries: any[]): boolean =>
  entries.every((entry) => Object.keys(entry.columns || {}).length > 0)

const resolveMigrationState = ({
  schemaVersion,
  entries,
  migration,
}: {
  schemaVersion: number,
  entries: any[],
  migration?: any,
}): {
  schemaVersion: number,
  sqliteMigrations: any | null,
  report: any | null,
  snapshot: any,
} => {
  const migrationOptions = migration || {}
  const baseSnapshot = migrationOptions.previousSnapshot || null
  const baseVersion = baseSnapshot ? Number(baseSnapshot.schemaVersion || 1) : Number(schemaVersion || 1)

  const nextSnapshot = createSchemaSnapshot(createSchemaTablesFromEntries(entries), baseVersion)
  const plan = planSchemaMigration(baseSnapshot, nextSnapshot, migrationOptions)

  if (plan.blockedDestructiveChanges.length > 0) {
    throw formatMigrationBlockedError(plan.blockedDestructiveChanges)
  }

  const effectiveSchemaVersion = baseSnapshot ? plan.nextSchemaVersion : Number(schemaVersion || 1)
  const snapshot = {
    ...nextSnapshot,
    schemaVersion: effectiveSchemaVersion,
  }

  if (typeof migrationOptions.onSnapshot === 'function') {
    migrationOptions.onSnapshot(snapshot)
  }

  return {
    schemaVersion: effectiveSchemaVersion,
    sqliteMigrations: plan.sqliteMigrations,
    report: plan,
    snapshot,
  }
}

const bootstrapDatabase = ({
  name,
  database,
  definedModels,
  schemaVersion = 1,
  platform = 'auto',
  native = {},
  web = {},
  sqliteMigrations = null,
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
        migrations: sqliteMigrations || undefined,
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

const buildModelApi = (baseApi: any, entry: any, model: any): any => {
  const baseCreate = baseApi.create.bind(baseApi)
  const baseCreateMany = baseApi.createMany.bind(baseApi)
  const baseUpdate = baseApi.update.bind(baseApi)
  const baseDelete = baseApi.delete.bind(baseApi)
  const baseUpsert = baseApi.upsert.bind(baseApi)
  const baseFetch = baseApi.fetch.bind(baseApi)
  const baseQuery = baseApi.query.bind(baseApi)
  const baseSubscribe = baseApi.subscribe.bind(baseApi)
  const basePatch = baseApi.patch.bind(baseApi)
  const baseRemove = baseApi.remove.bind(baseApi)
  const baseUseList = baseApi.useList.bind(baseApi)
  const baseUseById = baseApi.useById.bind(baseApi)
  const { appToStorage, storageToApp } = buildFieldMaps(model)

  const wrapResponse = (response: any, total: number): MutationResult<any> => {
    if (!response) {
      return errorMutation(new Error(`[HyperTillDB] Empty mutation response`), total)
    }
    if (response.error) {
      return errorMutation(response.error, total)
    }
    const rows = mapRowsToApp(response.data || [], storageToApp)
    const data = total === 1 ? firstOrNull(rows) : rows
    return successMutation(data, total, rows.length)
  }

  return {
    ...baseApi,
    query: (config?: any): any => baseQuery(mapQueryConfigToStorage(config, appToStorage)),
    fetch: async (config?: any): Promise<any> => {
      const response = await baseFetch(mapQueryConfigToStorage(config, appToStorage))
      if (response && !response.error) {
        return {
          ...response,
          data: mapRowsToApp(response.data || [], storageToApp),
        }
      }
      return response
    },
    subscribe: (config: any, listener: (payload: any) => void): (() => void) =>
      baseSubscribe(mapQueryConfigToStorage(config, appToStorage), (payload) => {
        if (payload && !payload.error) {
          listener({
            ...payload,
            data: mapRowsToApp(payload.data || [], storageToApp),
          })
          return
        }
        listener(payload)
      }),
    patch: async (where: { [string]: mixed }, values: { [string]: mixed }): Promise<any> => {
      const response = await basePatch(
        mapRowToStorage(where || {}, appToStorage),
        mapRowToStorage(values || {}, appToStorage),
      )
      if (response && !response.error) {
        return {
          ...response,
          data: mapRowsToApp(response.data || [], storageToApp),
        }
      }
      return response
    },
    remove: async (where: { [string]: mixed }): Promise<any> => {
      const response = await baseRemove(mapRowToStorage(where || {}, appToStorage))
      if (response && !response.error) {
        return {
          ...response,
          data: mapRowsToApp(response.data || [], storageToApp),
        }
      }
      return response
    },
    useList: (config?: any, deps?: mixed[]): any => {
      const state = baseUseList(mapQueryConfigToStorage(config, appToStorage), deps)
      if (state && Array.isArray(state.data)) {
        return {
          ...state,
          data: mapRowsToApp(state.data, storageToApp),
        }
      }
      return state
    },
    useById: (id: string, deps?: mixed[]): any => {
      const state = baseUseById(id, deps)
      if (state && state.data && typeof state.data === 'object') {
        return {
          ...state,
          data: mapRowToApp(state.data, storageToApp),
        }
      }
      return state
    },
    create: async (values: { [string]: mixed }): Promise<MutationResult<any>> => {
      try {
        const payload = applyCreateSystemFields(
          mapRowToStorage(values || {}, appToStorage),
          entry.timestamps,
        )
        const response = await baseCreate(payload)
        return wrapResponse(response, 1)
      } catch (error) {
        return errorMutation(error, 1)
      }
    },
    createMany: async (values: { [string]: mixed }[]): Promise<MutationResult<any[]>> => {
      try {
        const payload = values.map((item) =>
          applyCreateSystemFields(
            mapRowToStorage(item || {}, appToStorage),
            entry.timestamps,
          ),
        )
        const response = await baseCreateMany(payload)
        return wrapResponse(response, payload.length)
      } catch (error) {
        return errorMutation(error, values.length)
      }
    },
    update: async (id: string, values: { [string]: mixed }): Promise<MutationResult<any>> => {
      try {
        const payload = applyUpdateSystemFields(
          mapRowToStorage(values || {}, appToStorage),
          entry.timestamps,
        )
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
        const payload = rows.map((row) =>
          applyCreateSystemFields(
            mapRowToStorage(row || {}, appToStorage),
            entry.timestamps,
          ),
        )
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
  migration,
  reactiveOptions = {},
}: CreateDBOptions): any => {
  const usesSchemaModels = Array.isArray(models)
  const definedModels = isDefinedModels(models)
    ? models
    : usesSchemaModels
      ? buildDefinedModelsFromSchemaModels(models)
      : defineModels(models)
  const hasDefinedModelColumns = canAutoBootstrapFromDefinedModels(definedModels.entries)
  const shouldAutoBootstrapWithoutDatabase = usesSchemaModels || hasDefinedModelColumns

  if (!database && !shouldAutoBootstrapWithoutDatabase) {
    throw new Error(
      `[HyperTillDB] createDB() requires { database } when model metadata is missing. ` +
        `Use defineModel(...) models, or enable the HyperTill Type Metadata Babel plugin for dbModel<T>() auto-bootstrap.`,
    )
  }

  const migrationState = shouldAutoBootstrapWithoutDatabase
    ? resolveMigrationState({
        schemaVersion,
        entries: definedModels.entries,
        migration,
      })
    : {
        schemaVersion,
        sqliteMigrations: null,
        report: null,
        snapshot: null,
      }

  const runtime = bootstrapDatabase({
    name,
    database,
    definedModels,
    schemaVersion: migrationState.schemaVersion,
    platform,
    native,
    web,
    sqliteMigrations: migrationState.sqliteMigrations,
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
    migration: migrationState.report,
    snapshot: migrationState.snapshot,
    getModel: baseClient.getModel.bind(baseClient),
  }

  definedModels.entries.forEach((entry) => {
    const baseApi = baseClient[entry.table]
    const model = definedModels.models.find((candidate) => candidate.table === entry.table)
    const wrappedApi = buildModelApi(baseApi, entry, model)
    client[entry.table] = wrappedApi
    injectRootHooks(client, entry)
  })

  return client
}
