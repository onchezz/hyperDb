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
  __typeMeta?: {
    fields: {
      [string]: {
        kind: 'string' | 'number' | 'boolean' | 'json',
        optional?: boolean,
        indexed?: boolean,
        hasDefault?: boolean,
        defaultValue?: mixed,
        relationTable?: string,
      },
    },
  },
}>

export type DBModelDefinition = $ReadOnly<{
  __hypertillDbModel: true,
  relations: $ReadOnlyArray<RelationDescriptor>,
  options: DBModelOptions,
  typeMeta: ?{
    fields: {
      [string]: {
        kind: 'string' | 'number' | 'boolean' | 'json',
        optional?: boolean,
        indexed?: boolean,
        hasDefault?: boolean,
        defaultValue?: mixed,
        relationTable?: string,
      },
    },
  },
}>

export type DBModel = DBModelDefinition

export type DefinedModelEntry = $ReadOnly<{
  name: string,
  table: string,
  deleteMode: 'soft' | 'hard',
  timestamps: boolean,
  columns: {
    [string]: {
      type: 'string' | 'number' | 'boolean' | 'json',
      indexed: boolean,
      optional: boolean,
    },
  },
  relations: $ReadOnlyArray<
    $ReadOnly<{
      targetName: string,
      targetTable: string,
      foreignKey: string,
      fieldName: string,
      optional: boolean,
      indexed: boolean,
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

const toSingularSnake = (value: string): string => {
  const snake = toSnakeCase(value)
  if (snake.endsWith('_id')) {
    return snake.slice(0, -3)
  }
  return snake.endsWith('s') && snake.length > 1 ? snake.slice(0, -1) : snake
}

const inferRelationTargetFromField = (
  fieldName: string,
  tableByName: { [string]: string },
): ?string => {
  const snake = toSnakeCase(fieldName)
  if (!snake.endsWith('_id')) {
    return null
  }

  const targetBase = toSingularSnake(snake)
  const targetByModelName = Object.keys(tableByName).find(
    (candidate) => toSingularSnake(candidate) === targetBase,
  )
  if (targetByModelName) {
    return targetByModelName
  }

  const targetByTable = Object.keys(tableByName).find((candidate) => {
    const table = tableByName[candidate]
    return toSingularSnake(table) === targetBase
  })

  return targetByTable || null
}

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
    typeMeta:
      options.__typeMeta && options.__typeMeta.fields
        ? Object.freeze({
            fields: Object.freeze({
              ...options.__typeMeta.fields,
            }),
          })
        : null,
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

    const typeMetaFields = modelDef.typeMeta && modelDef.typeMeta.fields ? modelDef.typeMeta.fields : null
    const inferredRelations = []
    if (typeMetaFields) {
      Object.keys(typeMetaFields).forEach((fieldName) => {
        const fieldSpec = typeMetaFields[fieldName]
        const explicitTarget = fieldSpec && fieldSpec.relationTable
        const targetModelName = explicitTarget
          ? resolveTargetModelName(explicitTarget, tableByName)
          : inferRelationTargetFromField(fieldName, tableByName)

        if (!targetModelName) {
          return
        }

        const foreignKey = toSnakeCase(fieldName)
        inferredRelations.push({
          targetName: targetModelName,
          targetTable: tableByName[targetModelName],
          foreignKey,
          fieldName: inferFieldNameFromForeignKey(foreignKey),
          optional: fieldSpec && fieldSpec.optional === true,
          indexed: fieldSpec ? fieldSpec.indexed !== false : true,
        })
      })
    }

    const explicitRelations = modelDef.relations.map((item) => {
      const targetModelName = resolveTargetModelName(item.targetName, tableByName)
      const foreignKey = item.foreignKey || inferForeignKey(targetModelName)
      return {
        targetName: targetModelName,
        targetTable: tableByName[targetModelName],
        foreignKey,
        fieldName: inferFieldNameFromForeignKey(foreignKey),
        optional: false,
        indexed: true,
      }
    })

    const relationByForeignKey = {}
    inferredRelations.concat(explicitRelations).forEach((relation) => {
      relationByForeignKey[relation.foreignKey] = relation
    })

    const typedFields = typeMetaFields
      ? Object.keys(typeMetaFields)
          .sort((a, b) => a.localeCompare(b))
          .map((fieldName) => {
            const spec = typeMetaFields[fieldName]
            const columnName = toSnakeCase(fieldName)
            const relation = relationByForeignKey[columnName]
            const isRelation = !!relation

            return {
              name: fieldName,
              columnName,
              kind: isRelation ? 'relation' : spec.kind,
              optional: spec.optional === true,
              indexed: isRelation ? relation.indexed !== false : spec.indexed === true,
              hasDefault: spec.hasDefault === true,
              defaultValue: spec.defaultValue,
              relationTable: isRelation ? relation.targetTable : null,
            }
          })
      : []

    const extraRelationFields = Object.keys(relationByForeignKey)
      .filter((foreignKey) => !typedFields.some((field) => field.columnName === foreignKey))
      .map((foreignKey) => {
        const rel = relationByForeignKey[foreignKey]
        return {
          name: rel.fieldName,
          columnName: rel.foreignKey,
          kind: 'relation',
          optional: rel.optional === true,
          indexed: rel.indexed !== false,
          hasDefault: false,
          defaultValue: undefined,
          relationTable: rel.targetTable,
        }
      })

    const mergedFields = typedFields.concat(extraRelationFields)
    const columns = {}
    mergedFields
      .filter((field) => field.kind !== 'relation')
      .forEach((field) => {
        columns[field.columnName] = {
          type: field.kind,
          indexed: field.indexed === true,
          optional: field.optional === true,
        }
      })

    return {
      name: modelName,
      table,
      deleteMode: modelDef.options.deleteMode || 'soft',
      timestamps: modelDef.options.timestamps !== false,
      columns,
      relations: Object.freeze(
        Object.keys(relationByForeignKey)
          .sort((a, b) => a.localeCompare(b))
          .map((foreignKey) => relationByForeignKey[foreignKey]),
      ),
      fields: mergedFields,
    }
  })

  const baseModels = entries.map((entry) => {
    const baseFields =
      entry.fields && entry.fields.length
        ? entry.fields
        : entry.relations.map((rel) => ({
            name: rel.fieldName,
            columnName: rel.foreignKey,
            kind: 'relation',
            optional: rel.optional === true,
            indexed: rel.indexed !== false,
            hasDefault: false,
            defaultValue: undefined,
            relationTable: rel.targetTable,
          }))

    return {
      table: entry.table,
      name: entry.name,
      fields: baseFields,
    }
  })

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
