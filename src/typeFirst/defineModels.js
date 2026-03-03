// @noflow
/* eslint-disable no-undef */

import { invariant } from '../utils/common'
import { normalizeModels, toSnakeCase } from '../modeling/defineModel'

export type RelationDescriptor = $ReadOnly<{
  __hypertillRelation: true,
  targetName: string,
  foreignKey: ?string,
}>

export type DBModelOptions = $ReadOnly<{
  table?: string,
  deleteMode?: 'soft' | 'hard',
  timestamps?: boolean,
}>

export type DBModelDefinition = $ReadOnly<{
  __hypertillDbModel: true,
  relations: $ReadOnlyArray<RelationDescriptor>,
  options: DBModelOptions,
}>

export type DBModel = DBModelDefinition

export type DefinedModelEntry = $ReadOnly<{
  name: string,
  table: string,
  deleteMode: 'soft' | 'hard',
  timestamps: boolean,
  relations: $ReadOnlyArray<
    $ReadOnly<{
      targetName: string,
      targetTable: string,
      foreignKey: string,
      fieldName: string,
    }>,
  >,
}>

export type DefinedModels = $ReadOnly<{
  __hypertillDefinedModels: true,
  entries: $ReadOnlyArray<DefinedModelEntry>,
  models: $ReadOnlyArray<any>,
  byName: { [string]: DefinedModelEntry },
  byTable: { [string]: DefinedModelEntry },
}>

const DEFAULT_MODEL_OPTIONS: DBModelOptions = Object.freeze({
  deleteMode: 'soft',
  timestamps: true,
})

const isPlainObject = (value: mixed): boolean =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isRelationDescriptor = (value: mixed): boolean =>
  !!value &&
  typeof value === 'object' &&
  // $FlowFixMe[prop-missing]
  value.__hypertillRelation === true &&
  // $FlowFixMe[prop-missing]
  typeof value.targetName === 'string'

const isModelOptions = (value: mixed): boolean => {
  if (!isPlainObject(value)) {
    return false
  }
  // $FlowFixMe[prop-missing]
  return !value.__hypertillRelation && !value.__hypertillDbModel
}

const toCamelCase = (value: string): string =>
  value.replace(/_([a-z])/g, (_match, group) => group.toUpperCase())

const inferTableName = (modelName: string): string => {
  const snake = toSnakeCase(modelName)
  return snake.endsWith('s') ? snake : `${snake}s`
}

const inferForeignKey = (targetName: string): string => `${toSnakeCase(targetName)}_id`

const inferFieldNameFromForeignKey = (foreignKey: string): string => toCamelCase(foreignKey)

const resolveTargetModelName = (
  targetName: string,
  tableByName: { [string]: string },
): string => {
  if (tableByName[targetName]) {
    return targetName
  }

  const byCaseInsensitive = Object.keys(tableByName).find(
    (candidate) => candidate.toLowerCase() === targetName.toLowerCase(),
  )
  if (byCaseInsensitive) {
    return byCaseInsensitive
  }

  const byTable = Object.keys(tableByName).find((candidate) => tableByName[candidate] === targetName)
  if (byTable) {
    return byTable
  }

  throw new Error(`[HyperTillDB] Unknown relation target '${targetName}'. Add a matching model in defineModels().`)
}

export const createRelationDescriptor = (
  targetName: string,
  foreignKey?: string,
): RelationDescriptor => {
  invariant(
    typeof targetName === 'string' && targetName.length > 0,
    `[HyperTillDB] relation target name must be a non-empty string`,
  )
  if (foreignKey !== undefined) {
    invariant(
      typeof foreignKey === 'string' && foreignKey.length > 0,
      `[HyperTillDB] relation foreignKey must be a non-empty string`,
    )
  }
  return Object.freeze({
    __hypertillRelation: true,
    targetName,
    foreignKey: foreignKey || null,
  })
}

export const dbModel = (...args: mixed[]): DBModelDefinition => {
  const relations = []
  let options = DEFAULT_MODEL_OPTIONS

  args.forEach((arg) => {
    if (Array.isArray(arg)) {
      arg.forEach((item) => {
        invariant(isRelationDescriptor(item), `[HyperTillDB] dbModel() relation arrays must contain relation.*() values`)
        relations.push(item)
      })
      return
    }

    if (isRelationDescriptor(arg)) {
      relations.push(arg)
      return
    }

    if (isModelOptions(arg)) {
      options = {
        ...options,
        // $FlowFixMe[incompatible-use]
        ...arg,
      }
      return
    }

    throw new Error(`[HyperTillDB] dbModel() expects relation.*() values and/or an options object`)
  })

  return Object.freeze({
    __hypertillDbModel: true,
    relations: Object.freeze(relations),
    options: Object.freeze(options),
  })
}

export const isDBModelDefinition = (value: mixed): boolean =>
  !!value &&
  typeof value === 'object' &&
  // $FlowFixMe[prop-missing]
  value.__hypertillDbModel === true &&
  // $FlowFixMe[prop-missing]
  Array.isArray(value.relations)

const defineModelEntries = (modelsShape: { [string]: DBModelDefinition }): DefinedModels => {
  const modelNames = Object.keys(modelsShape)
  invariant(modelNames.length > 0, `[HyperTillDB] defineModels() requires at least one model`)

  const tableByName = {}
  modelNames.forEach((modelName) => {
    const modelDef = modelsShape[modelName]
    invariant(
      isDBModelDefinition(modelDef),
      `[HyperTillDB] defineModels() expects dbModel() values. Invalid model: '${modelName}'`,
    )

    const table = modelDef.options.table || inferTableName(modelName)
    invariant(
      typeof table === 'string' && table.length > 0,
      `[HyperTillDB] Invalid table for model '${modelName}'`,
    )
    tableByName[modelName] = table
  })

  const entries = modelNames.map((modelName) => {
    const modelDef = modelsShape[modelName]
    const table = tableByName[modelName]
    const relations = modelDef.relations.map((item) => {
      const targetModelName = resolveTargetModelName(item.targetName, tableByName)
      const foreignKey = item.foreignKey || inferForeignKey(targetModelName)
      return {
        targetName: targetModelName,
        targetTable: tableByName[targetModelName],
        foreignKey,
        fieldName: inferFieldNameFromForeignKey(foreignKey),
      }
    })

    return {
      name: modelName,
      table,
      deleteMode: modelDef.options.deleteMode || 'soft',
      timestamps: modelDef.options.timestamps !== false,
      relations,
    }
  })

  const baseModels = entries.map((entry) => ({
    table: entry.table,
    name: entry.name,
    fields: entry.relations.map((rel) => ({
      name: rel.fieldName,
      columnName: rel.foreignKey,
      kind: 'relation',
      optional: false,
      indexed: true,
      hasDefault: false,
      defaultValue: undefined,
      relationTable: rel.targetTable,
    })),
  }))

  const normalizedBaseModels = normalizeModels(baseModels)
  const normalizedByTable = normalizedBaseModels.reduce((acc, modelDef) => {
    acc[modelDef.table] = modelDef
    return acc
  }, {})

  const normalizedEntries = entries
    .map((entry) => ({
      ...entry,
      relations: Object.freeze([...entry.relations]),
    }))
    .sort((a, b) => a.table.localeCompare(b.table))

  const byName = normalizedEntries.reduce((acc, entry) => {
    acc[entry.name] = entry
    return acc
  }, {})
  const byTable = normalizedEntries.reduce((acc, entry) => {
    acc[entry.table] = entry
    return acc
  }, {})

  const models = normalizedEntries.map((entry) => normalizedByTable[entry.table])

  return Object.freeze({
    __hypertillDefinedModels: true,
    entries: Object.freeze(normalizedEntries),
    models: Object.freeze(models),
    byName: Object.freeze(byName),
    byTable: Object.freeze(byTable),
  })
}

export const defineModels = (modelsShape: { [string]: DBModelDefinition }): DefinedModels => {
  invariant(
    isPlainObject(modelsShape),
    `[HyperTillDB] defineModels() expects an object map: { Book: dbModel<Book>() }`,
  )
  return defineModelEntries(modelsShape)
}

export const isDefinedModels = (value: mixed): boolean =>
  !!value &&
  typeof value === 'object' &&
  // $FlowFixMe[prop-missing]
  value.__hypertillDefinedModels === true &&
  // $FlowFixMe[prop-missing]
  Array.isArray(value.entries) &&
  // $FlowFixMe[prop-missing]
  Array.isArray(value.models)
