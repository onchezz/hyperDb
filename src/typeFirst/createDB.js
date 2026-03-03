// @noflow

import { createHyperTill } from '../runtime/createHyperTill'
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
  database: any,
  models: any,
  reactiveOptions?: { idGenerator?: () => string },
}

type MutationMode = 'soft' | 'hard'

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
  reactiveOptions = {},
}: CreateDBOptions): any => {
  const definedModels = isDefinedModels(models) ? models : defineModels(models)
  const baseClient = createHyperTill({
    database,
    models: definedModels.models,
    reactiveOptions,
  })

  const client: { [string]: any } = {
    name: name || null,
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
