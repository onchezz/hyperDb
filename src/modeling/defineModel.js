// @noflow
/* eslint-disable no-undef */

import { invariant } from '../utils/common'
import { normalizeFieldSpec } from './fields'

export type ModelField = $ReadOnly<{
  name: string,
  columnName: string,
  kind: 'string' | 'number' | 'boolean' | 'json' | 'relation',
  optional: boolean,
  indexed: boolean,
  hasDefault: boolean,
  defaultValue: mixed,
  relationTable: ?string,
}>

export type ModelDefinition = $ReadOnly<{
  table: string,
  name: string,
  fields: $ReadOnlyArray<ModelField>,
}>

const isUpper = (char: string): boolean => /[A-Z]/.test(char)

export const toSnakeCase = (value: string): string => {
  if (!value) {
    return value
  }

  const chars = value.split('')
  let output = chars[0].toLowerCase()
  for (let i = 1; i < chars.length; i += 1) {
    const char = chars[i]
    if (isUpper(char) && chars[i - 1] !== '_') {
      output += `_${char.toLowerCase()}`
    } else {
      output += char.toLowerCase()
    }
  }
  return output.replace(/__+/g, '_')
}

const toPascalCase = (value: string): string =>
  value
    .replace(/[-_\s]+(.)?/g, (_match, group) => (group ? group.toUpperCase() : ''))
    .replace(/^(.)/, (first) => first.toUpperCase())

const inferModelName = (table: string): string => {
  const singular = table.endsWith('s') && table.length > 1 ? table.slice(0, -1) : table
  return toPascalCase(singular)
}

const inferRelationColumn = (fieldName: string): string => {
  const snake = toSnakeCase(fieldName)
  return snake.endsWith('_id') ? snake : `${snake}_id`
}

export const defineModel = (
  table: string,
  fieldsShape: { [string]: any },
  options: { name?: string } = {},
): ModelDefinition => {
  invariant(typeof table === 'string' && table.length > 0, `[HyperTillDB] defineModel() requires table name`)
  invariant(!!fieldsShape && typeof fieldsShape === 'object', `[HyperTillDB] defineModel() requires a fields object`)

  const fieldNames = Object.keys(fieldsShape)
  invariant(fieldNames.length > 0, `[HyperTillDB] defineModel('${table}') must define at least one field`)

  const fields: ModelField[] = fieldNames
    .sort((a, b) => a.localeCompare(b))
    .map((fieldName) => {
      const rawSpec = normalizeFieldSpec(fieldsShape[fieldName])
      if (rawSpec.kind === 'relation') {
        invariant(
          typeof rawSpec.relationTable === 'string' && rawSpec.relationTable.length > 0,
          `[HyperTillDB] relation field '${fieldName}' on '${table}' must include a target table`,
        )
      }

      const columnName = rawSpec.kind === 'relation'
        ? rawSpec.foreignKey || inferRelationColumn(fieldName)
        : toSnakeCase(fieldName)

      return {
        name: fieldName,
        columnName,
        kind: rawSpec.kind,
        optional: !!rawSpec.optional,
        indexed: !!rawSpec.indexed,
        hasDefault: !!rawSpec.hasDefault,
        defaultValue: rawSpec.defaultValue,
        relationTable: rawSpec.relationTable,
      }
    })

  return Object.freeze({
    table,
    name: options.name || inferModelName(table),
    fields: Object.freeze(fields),
  })
}

export const normalizeModels = (models: ModelDefinition[]): ModelDefinition[] => {
  invariant(Array.isArray(models), `[HyperTillDB] models must be an array`)
  const tablesSeen = new Set()

  const normalized = models
    .map((model) => {
      invariant(model && typeof model === 'object', `[HyperTillDB] Invalid model in models array`)
      invariant(typeof model.table === 'string' && model.table.length > 0, `[HyperTillDB] Invalid model.table`)
      invariant(Array.isArray(model.fields), `[HyperTillDB] Model '${model.table}' is missing fields array`)

      if (tablesSeen.has(model.table)) {
        throw new Error(`[HyperTillDB] Duplicate model table '${model.table}'`)
      }
      tablesSeen.add(model.table)

      return {
        ...model,
        name: model.name || inferModelName(model.table),
        fields: [...model.fields].sort((a, b) => a.columnName.localeCompare(b.columnName)),
      }
    })
    .sort((a, b) => a.table.localeCompare(b.table))

  const tableSet = new Set(normalized.map((model) => model.table))
  normalized.forEach((model) => {
    model.fields.forEach((field) => {
      if (field.kind === 'relation') {
        invariant(
          field.relationTable && tableSet.has(field.relationTable),
          `[HyperTillDB] Relation '${model.table}.${field.name}' targets missing table '${String(
            field.relationTable,
          )}'`,
        )
      }
    })
  })

  return normalized
}
