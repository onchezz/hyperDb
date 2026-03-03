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

type MutationStatus = 'success' | 'partial_success' | 'error'

export type MutationProgress = {
  current: number,
  total: number,
  processed: number,
  written: number,
  failed: number,
  percent: number,
  chunk: number,
  chunksTotal: number,
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
export type BulkWriteOptions = {
  chunkSize?: number,
  yieldMs?: number,
  onProgress?: (progress: MutationProgress) => void,
}

const DEFAULT_DB_NAME = 'hypertill'
const DEFAULT_WEB_DB_NAME = 'hypertill_web'
const DEFAULT_CREATE_MANY_CHUNK_SIZE = 250
const DEFAULT_CREATE_MANY_YIELD_MS = 0

const toPlural = (value: string): string => (value.endsWith('s') ? value : `${value}s`)

const normalizeError = (value: mixed): Error => {
  if (value instanceof Error) {
    return value
  }
  return new Error(String(value))
}

const buildProgress = (
  current: number,
  total: number,
  options: {
    processed?: number,
    failed?: number,
    chunk?: number,
    chunksTotal?: number,
  } = {},
): MutationProgress => ({
  current,
  total,
  processed: options.processed === undefined ? current : options.processed,
  written: current,
  failed: options.failed === undefined ? Math.max(0, total - current) : options.failed,
  percent: total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 100,
  chunk: options.chunk || 1,
  chunksTotal: options.chunksTotal || 1,
})

const successMutation = <T>(
  data: ?T,
  total: number,
  current: number,
  options: {
    chunk?: number,
    chunksTotal?: number,
  } = {},
): MutationResult<T> => ({
  data,
  error: null,
  loading: false,
  status: 'success',
  progress: buildProgress(current, total, {
    processed: current,
    failed: Math.max(0, total - current),
    chunk: options.chunk,
    chunksTotal: options.chunksTotal,
  }),
})

const errorMutation = <T>(
  error: mixed,
  total: number,
  options: {
    data?: ?T,
    current?: number,
    processed?: number,
    failed?: number,
    chunk?: number,
    chunksTotal?: number,
  } = {},
): MutationResult<T> => ({
  data: options.data === undefined ? null : options.data,
  error: normalizeError(error),
  loading: false,
  status: options.current && options.current > 0 ? 'partial_success' : 'error',
  progress: buildProgress(options.current || 0, total, {
    processed: options.processed,
    failed: options.failed,
    chunk: options.chunk,
    chunksTotal: options.chunksTotal,
  }),
})

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms))
  })

const splitIntoChunks = <T>(values: T[], chunkSize: number): T[][] => {
  const normalizedChunkSize = Math.max(1, Math.floor(chunkSize))
  if (!values.length) {
    return []
  }
  const chunks = []
  for (let index = 0; index < values.length; index += normalizedChunkSize) {
    chunks.push(values.slice(index, index + normalizedChunkSize))
  }
  return chunks
}

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

const normalizeOrderBy = (orderBy: any, appToStorage: { [string]: string }): any => {
  if (!orderBy) {
    return orderBy
  }

  if (typeof orderBy === 'string') {
    return appToStorage[orderBy] || orderBy
  }

  if (typeof orderBy === 'object' && orderBy.column) {
    return {
      ...orderBy,
      column: appToStorage[orderBy.column] || orderBy.column,
    }
  }

  if (typeof orderBy === 'object') {
    const keys = Object.keys(orderBy)
    if (keys.length) {
      const column = keys[0]
      const direction = orderBy[column]
      const normalizedDirection =
        typeof direction === 'string'
          ? direction.toLowerCase()
          : direction === false
            ? 'desc'
            : 'asc'

      return {
        column: appToStorage[column] || column,
        ascending: normalizedDirection !== 'desc',
      }
    }
  }

  return orderBy
}

const normalizeSearchConfig = (config: any, defaultColumns: string[] = []): any => {
  if (!config) {
    return null
  }

  if (typeof config === 'string') {
    if (!config.trim().length) {
      return null
    }
    return {
      value: config,
      columns: defaultColumns,
      mode: 'contains',
    }
  }

  const searchValue = typeof config.value === 'string' ? config.value : config.search
  if (typeof searchValue !== 'string' || !searchValue.trim().length) {
    return null
  }

  const columns = Array.isArray(config.columns)
    ? config.columns
    : typeof config.columns === 'string'
      ? [config.columns]
      : defaultColumns

  return {
    value: searchValue,
    columns,
    mode: config.mode || 'contains',
  }
}

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

  mapped.orderBy = normalizeOrderBy(mapped.orderBy, appToStorage)

  if (Array.isArray(mapped.select)) {
    mapped.select = mapped.select.map((item) => appToStorage[item] || item)
  }

  if (mapped.search) {
    const normalizedSearch = normalizeSearchConfig(mapped.search)
    if (normalizedSearch) {
      mapped.search = {
        ...normalizedSearch,
        columns: (normalizedSearch.columns || []).map((item) => appToStorage[item] || item),
      }
    } else {
      delete mapped.search
    }
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

  const defaultSearchStorageColumns = Object.keys(entry.columns || {}).filter((columnName) => {
    const column = (entry.columns || {})[columnName]
    return !!column && column.type === 'string'
  })
  const defaultSearchAppColumns = defaultSearchStorageColumns.map(
    (columnName) => storageToApp[columnName] || columnName,
  )

  const mapResponseToApp = (response: any): any => {
    if (response && !response.error) {
      return {
        ...response,
        data: mapRowsToApp(response.data || [], storageToApp),
      }
    }
    return response
  }

  const wrapResponse = (
    response: any,
    total: number,
    options: { chunk?: number, chunksTotal?: number } = {},
  ): MutationResult<any> => {
    if (!response) {
      return errorMutation(new Error(`[HyperTillDB] Empty mutation response`), total, {
        chunk: options.chunk,
        chunksTotal: options.chunksTotal,
      })
    }
    if (response.error) {
      return errorMutation(response.error, total, {
        chunk: options.chunk,
        chunksTotal: options.chunksTotal,
      })
    }
    const rows = mapRowsToApp(response.data || [], storageToApp)
    const data = total === 1 ? firstOrNull(rows) : rows
    return successMutation(data, total, rows.length, {
      chunk: options.chunk,
      chunksTotal: options.chunksTotal,
    })
  }

  const toSearchQueryConfig = (config: any): any => {
    const baseConfig = typeof config === 'string' ? { search: config } : { ...(config || {}) }
    const searchSource =
      baseConfig.search === undefined
        ? {
            value: baseConfig.value,
            columns: baseConfig.columns,
            mode: baseConfig.mode,
          }
        : typeof baseConfig.search === 'string'
          ? {
              value: baseConfig.search,
              columns: baseConfig.columns,
              mode: baseConfig.mode,
            }
          : {
              ...baseConfig.search,
              columns: baseConfig.search.columns || baseConfig.columns,
              mode: baseConfig.search.mode || baseConfig.mode,
            }

    const normalizedSearch = normalizeSearchConfig(searchSource, defaultSearchAppColumns)
    delete baseConfig.columns
    delete baseConfig.mode
    delete baseConfig.value
    baseConfig.search = normalizedSearch
    if (!normalizedSearch) {
      delete baseConfig.search
    }
    return baseConfig
  }

  return {
    ...baseApi,
    query: (config?: any): any =>
      baseQuery(mapQueryConfigToStorage(toSearchQueryConfig(config), appToStorage)),
    fetch: async (config?: any): Promise<any> =>
      mapResponseToApp(
        await baseFetch(mapQueryConfigToStorage(toSearchQueryConfig(config), appToStorage)),
      ),
    search: async (config?: any): Promise<any> =>
      mapResponseToApp(
        await baseFetch(mapQueryConfigToStorage(toSearchQueryConfig(config), appToStorage)),
      ),
    subscribe: (config: any, listener: (payload: any) => void): (() => void) =>
      baseSubscribe(
        mapQueryConfigToStorage(toSearchQueryConfig(config), appToStorage),
        (payload) => {
          if (payload && !payload.error) {
            listener({
              ...payload,
              data: mapRowsToApp(payload.data || [], storageToApp),
            })
            return
          }
          listener(payload)
        },
      ),
    patch: async (where: { [string]: mixed }, values: { [string]: mixed }): Promise<any> =>
      mapResponseToApp(
        await basePatch(
          mapRowToStorage(where || {}, appToStorage),
          mapRowToStorage(values || {}, appToStorage),
        ),
      ),
    remove: async (where: { [string]: mixed }): Promise<any> =>
      mapResponseToApp(await baseRemove(mapRowToStorage(where || {}, appToStorage))),
    useList: (config?: any, deps?: mixed[]): any => {
      const state = baseUseList(
        mapQueryConfigToStorage(toSearchQueryConfig(config), appToStorage),
        deps,
      )
      if (state && Array.isArray(state.data)) {
        return {
          ...state,
          data: mapRowsToApp(state.data, storageToApp),
        }
      }
      return state
    },
    useSearch: (config?: any, deps?: mixed[]): any => {
      const state = baseUseList(
        mapQueryConfigToStorage(toSearchQueryConfig(config), appToStorage),
        deps,
      )
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
    createMany: async (
      values: { [string]: mixed }[],
      options: BulkWriteOptions = {},
    ): Promise<MutationResult<any[]>> => {
      const sourceValues = Array.isArray(values) ? values : []
      try {
        const payload = sourceValues.map((item) =>
          applyCreateSystemFields(
            mapRowToStorage(item || {}, appToStorage),
            entry.timestamps,
          ),
        )
        const total = payload.length
        if (total === 0) {
          return successMutation([], 0, 0)
        }

        const chunkSize =
          typeof options.chunkSize === 'number'
            ? options.chunkSize
            : DEFAULT_CREATE_MANY_CHUNK_SIZE
        const yieldMs =
          typeof options.yieldMs === 'number'
            ? options.yieldMs
            : DEFAULT_CREATE_MANY_YIELD_MS
        const onProgress =
          typeof options.onProgress === 'function'
            ? options.onProgress
            : null

        const chunks = splitIntoChunks(payload, chunkSize)
        const chunksTotal = chunks.length
        let writtenStorageRows = []
        const seenIds = new Set()

        for (let index = 0; index < chunks.length; index += 1) {
          const chunk = chunks[index]
          const chunkIds = new Set()
          for (const row of chunk) {
            const rowId = typeof row.id === 'string' ? row.id : null
            if (rowId && (seenIds.has(rowId) || chunkIds.has(rowId))) {
              const mappedRows = mapRowsToApp(writtenStorageRows, storageToApp)
              const written = mappedRows.length
              const failed = Math.max(0, total - written)
              return errorMutation(
                new Error(
                  `[HyperTillDB] Duplicate id '${rowId}' found in createMany() payload for table '${entry.table}'`,
                ),
                total,
                {
                  data: mappedRows,
                  current: written,
                  processed: written + failed,
                  failed,
                  chunk: index + 1,
                  chunksTotal,
                },
              )
            }
            if (rowId) {
              chunkIds.add(rowId)
            }
          }

          for (const row of chunk) {
            const response = await baseCreate(row)
            if (!response || response.error) {
              const mappedRows = mapRowsToApp(writtenStorageRows, storageToApp)
              const written = mappedRows.length
              const failed = Math.max(0, total - written)
              return errorMutation(
                response ? response.error : new Error(`[HyperTillDB] Empty mutation response`),
                total,
                {
                  data: mappedRows,
                  current: written,
                  processed: written + failed,
                  failed,
                  chunk: index + 1,
                  chunksTotal,
                },
              )
            }

            const createdRows = Array.isArray(response.data) ? response.data : []
            if (createdRows.length) {
              writtenStorageRows = writtenStorageRows.concat(createdRows[0])
            } else {
              writtenStorageRows = writtenStorageRows.concat(row)
            }
          }

          chunkIds.forEach((id) => seenIds.add(id))
          const written = writtenStorageRows.length
          const progress = buildProgress(written, total, {
            processed: written,
            failed: Math.max(0, total - written),
            chunk: index + 1,
            chunksTotal,
          })
          if (onProgress) {
            onProgress(progress)
          }

          if (index < chunks.length - 1) {
            await pause(yieldMs)
          }
        }

        const mappedRows = mapRowsToApp(writtenStorageRows, storageToApp)
        return successMutation(mappedRows, total, mappedRows.length, {
          chunk: chunksTotal,
          chunksTotal,
        })
      } catch (error) {
        return errorMutation(error, sourceValues.length)
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
    upsert: async (
      values: { [string]: mixed } | { [string]: mixed }[],
      options?: mixed,
    ): Promise<MutationResult<any[]>> => {
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
  const useSearchHookName = `use${entry.name}Search`

  client[useListHookName] = (config?: any, deps?: mixed[]) => modelApi.useList(config, deps)
  client[useByIdHookName] = (id: string, deps?: mixed[]) => modelApi.useById(id, deps)
  client[useSearchHookName] = (config?: any, deps?: mixed[]) => modelApi.useSearch(config, deps)

  entry.relations.forEach((rel) => {
    const relationHookName = `use${plural}By${rel.targetName}Id`
    const relationHookAliasName = `use${plural}By${rel.targetName}`
    const modelHookName = `useBy${rel.targetName}Id`
    const modelHookAliasName = `useBy${rel.targetName}`
    const hook = (targetId: string, config: any = {}, deps: mixed[] = []) => {
      const where = {
        ...(config.where || {}),
        [rel.fieldName || rel.foreignKey]: targetId,
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
    client[relationHookAliasName] = hook
    modelApi[modelHookName] = hook
    modelApi[modelHookAliasName] = hook
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
