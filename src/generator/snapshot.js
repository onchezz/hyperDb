// @noflow

import { readJsonFile, stableStringify } from './utils'

export type ModelSnapshot = {
  table: string,
  name: string,
  fields: Array<{
    name: string,
    columnName: string,
    kind: string,
    optional: boolean,
    indexed: boolean,
    hasDefault: boolean,
    defaultValue: mixed,
    relationTable: ?string,
  }>,
}

export type SnapshotFile = {
  schemaVersion: number,
  generatedAt: string,
  models: ModelSnapshot[],
}

const normalizeField = (field: any): any => ({
  name: field.name,
  columnName: field.columnName,
  kind: field.kind,
  optional: !!field.optional,
  indexed: !!field.indexed,
  hasDefault: !!field.hasDefault,
  defaultValue: field.defaultValue,
  relationTable: field.relationTable || null,
})

const normalizeModel = (model: any): ModelSnapshot => ({
  table: model.table,
  name: model.name,
  fields: [...model.fields]
    .map(normalizeField)
    .sort((a, b) => a.columnName.localeCompare(b.columnName)),
})

export const createSnapshot = (models: any[], schemaVersion: number): SnapshotFile => ({
  schemaVersion,
  generatedAt: new Date().toISOString(),
  models: [...models].map(normalizeModel).sort((a, b) => a.table.localeCompare(b.table)),
})

export const loadSnapshot = (filePath: string): ?SnapshotFile => {
  const json = readJsonFile(filePath)
  if (!json) {
    return null
  }
  if (!Array.isArray(json.models)) {
    throw new Error(`[HyperTillDB] Invalid snapshot file at ${filePath}`)
  }
  return {
    schemaVersion: Number(json.schemaVersion || 1),
    generatedAt: typeof json.generatedAt === 'string' ? json.generatedAt : new Date(0).toISOString(),
    models: json.models.map(normalizeModel).sort((a, b) => a.table.localeCompare(b.table)),
  }
}

export const snapshotFingerprint = (snapshot: SnapshotFile): string =>
  stableStringify({
    schemaVersion: snapshot.schemaVersion,
    models: snapshot.models,
  })
