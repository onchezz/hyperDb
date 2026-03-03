// @noflow

import { addColumns, createTable, schemaMigrations, unsafeExecuteSql } from '../Schema/migrations'

type StorageColumnType = 'string' | 'number' | 'boolean'

export type SchemaSnapshotColumn = {
  name: string,
  type: StorageColumnType,
  isIndexed: boolean,
  isOptional: boolean,
}

export type SchemaSnapshotTable = {
  table: string,
  columns: SchemaSnapshotColumn[],
}

export type SchemaSnapshot = {
  schemaVersion: number,
  generatedAt: string,
  tables: SchemaSnapshotTable[],
}

type RenameMap = {
  [string]: {
    [string]: string,
  },
}

type Diff = {
  addedTables: Array<{ table: string, after: SchemaSnapshotTable }>,
  removedTables: Array<{ table: string, before: SchemaSnapshotTable }>,
  addedColumns: Array<{ table: string, column: string, after: SchemaSnapshotColumn }>,
  removedColumns: Array<{ table: string, column: string, before: SchemaSnapshotColumn }>,
  changedColumns: Array<{
    table: string,
    column: string,
    before: SchemaSnapshotColumn,
    after: SchemaSnapshotColumn,
  }>,
  hasChanges: boolean,
  hasDestructiveChanges: boolean,
}

export type MigrationOptions = {
  mode?: 'strict' | 'smart',
  autoDefaults?: boolean,
  detectRename?: 'none' | 'same-type-one-to-one',
  renameMap?: RenameMap,
  previousSnapshot?: SchemaSnapshot,
  onSnapshot?: (snapshot: SchemaSnapshot) => void,
}

export type MigrationBlockedChange =
  | { type: 'removed_table', table: string }
  | { type: 'removed_column', table: string, column: string }
  | {
      type: 'changed_column',
      table: string,
      column: string,
      before: SchemaSnapshotColumn,
      after: SchemaSnapshotColumn,
    }

export type MigrationPlan = {
  hasChanges: boolean,
  hasDestructiveChanges: boolean,
  blockedDestructiveChanges: MigrationBlockedChange[],
  inferredRenameMap: RenameMap,
  renameMap: RenameMap,
  steps: any[],
  sqliteMigrations: any | null,
  previousSchemaVersion: number,
  nextSchemaVersion: number,
}

const normalizeColumn = (column: SchemaSnapshotColumn): SchemaSnapshotColumn => ({
  name: String(column.name),
  type: column.type === 'number' || column.type === 'boolean' ? column.type : 'string',
  isIndexed: column.isIndexed === true,
  isOptional: column.isOptional === true,
})

const normalizeTable = (table: SchemaSnapshotTable): SchemaSnapshotTable => ({
  table: String(table.table),
  columns: [...(table.columns || [])]
    .map(normalizeColumn)
    .sort((a, b) => a.name.localeCompare(b.name)),
})

const toTableMap = (snapshot: ?SchemaSnapshot): Map<string, SchemaSnapshotTable> =>
  new Map((snapshot?.tables || []).map((table) => [table.table, normalizeTable(table)]))

const toColumnMap = (table: SchemaSnapshotTable): Map<string, SchemaSnapshotColumn> =>
  new Map((table.columns || []).map((column) => [column.name, normalizeColumn(column)]))

const sameColumnShape = (a: SchemaSnapshotColumn, b: SchemaSnapshotColumn): boolean =>
  a.type === b.type && a.isIndexed === b.isIndexed && a.isOptional === b.isOptional

const columnSignature = (column: SchemaSnapshotColumn): string =>
  `${column.type}|${column.isIndexed ? '1' : '0'}|${column.isOptional ? '1' : '0'}`

const diffSnapshots = (previousSnapshot: ?SchemaSnapshot, nextSnapshot: SchemaSnapshot): Diff => {
  const addedTables = []
  const removedTables = []
  const addedColumns = []
  const removedColumns = []
  const changedColumns = []

  const prevTables = toTableMap(previousSnapshot)
  const nextTables = toTableMap(nextSnapshot)

  nextTables.forEach((nextTable, tableName) => {
    const prevTable = prevTables.get(tableName)
    if (!prevTable) {
      addedTables.push({ table: tableName, after: nextTable })
      return
    }

    const prevColumns = toColumnMap(prevTable)
    const nextColumns = toColumnMap(nextTable)

    nextColumns.forEach((after, columnName) => {
      const before = prevColumns.get(columnName)
      if (!before) {
        addedColumns.push({ table: tableName, column: columnName, after })
        return
      }
      if (!sameColumnShape(before, after)) {
        changedColumns.push({
          table: tableName,
          column: columnName,
          before,
          after,
        })
      }
    })

    prevColumns.forEach((before, columnName) => {
      if (!nextColumns.has(columnName)) {
        removedColumns.push({ table: tableName, column: columnName, before })
      }
    })
  })

  prevTables.forEach((before, tableName) => {
    if (!nextTables.has(tableName)) {
      removedTables.push({ table: tableName, before })
    }
  })

  const hasChanges =
    addedTables.length > 0 ||
    removedTables.length > 0 ||
    addedColumns.length > 0 ||
    removedColumns.length > 0 ||
    changedColumns.length > 0

  const hasDestructiveChanges =
    removedTables.length > 0 || removedColumns.length > 0 || changedColumns.length > 0

  return {
    addedTables,
    removedTables,
    addedColumns,
    removedColumns,
    changedColumns,
    hasChanges,
    hasDestructiveChanges,
  }
}

const mergeRenameMaps = (explicitMap: RenameMap = {}, inferredMap: RenameMap = {}): RenameMap => {
  const merged = { ...inferredMap }
  Object.keys(explicitMap).forEach((table) => {
    merged[table] = {
      ...(merged[table] || {}),
      ...(explicitMap[table] || {}),
    }
  })
  return merged
}

const inferRenameMap = (diff: Diff): RenameMap => {
  const byTableRemoved = {}
  const byTableAdded = {}

  diff.removedColumns.forEach((item) => {
    if (!byTableRemoved[item.table]) {
      byTableRemoved[item.table] = []
    }
    byTableRemoved[item.table].push(item)
  })

  diff.addedColumns.forEach((item) => {
    if (!byTableAdded[item.table]) {
      byTableAdded[item.table] = []
    }
    byTableAdded[item.table].push(item)
  })

  const renameMap = {}
  Object.keys(byTableRemoved).forEach((table) => {
    const removed = byTableRemoved[table]
    const added = byTableAdded[table] || []
    if (!removed.length || !added.length) {
      return
    }

    const usedTargets = new Set()
    removed.forEach((removedColumn) => {
      const targetCandidates = added.filter(
        (addedColumn) =>
          !usedTargets.has(addedColumn.column) &&
          columnSignature(addedColumn.after) === columnSignature(removedColumn.before),
      )
      if (targetCandidates.length === 1) {
        const match = targetCandidates[0]
        if (!renameMap[table]) {
          renameMap[table] = {}
        }
        renameMap[table][removedColumn.column] = match.column
        usedTargets.add(match.column)
      }
    })
  })

  return renameMap
}

const isRemovedColumnCovered = (diff: Diff, renameMap: RenameMap, table: string, column: string): boolean => {
  const mapped = renameMap[table] && renameMap[table][column]
  if (!mapped) {
    return false
  }
  return diff.addedColumns.some((added) => added.table === table && added.column === mapped)
}

const toMigrationColumn = (column: SchemaSnapshotColumn) => ({
  name: column.name,
  type: column.type,
  isIndexed: column.isIndexed === true,
  isOptional: column.isOptional === true,
})

const buildMigrationSteps = (diff: Diff, renameMap: RenameMap): any[] => {
  const steps = []

  diff.addedTables
    .slice()
    .sort((a, b) => a.table.localeCompare(b.table))
    .forEach(({ after }) => {
      steps.push(
        createTable({
          name: after.table,
          columns: after.columns.map(toMigrationColumn),
        }),
      )
    })

  const addedColumnsByTable = {}
  diff.addedColumns.forEach((item) => {
    if (!addedColumnsByTable[item.table]) {
      addedColumnsByTable[item.table] = []
    }
    addedColumnsByTable[item.table].push(item.after)
  })

  Object.keys(addedColumnsByTable)
    .sort((a, b) => a.localeCompare(b))
    .forEach((table) => {
      steps.push(
        addColumns({
          table,
          columns: addedColumnsByTable[table]
            .map(toMigrationColumn)
            .sort((a, b) => a.name.localeCompare(b.name)),
        }),
      )
    })

  Object.keys(renameMap)
    .sort((a, b) => a.localeCompare(b))
    .forEach((table) => {
      const tableMap = renameMap[table]
      Object.keys(tableMap)
        .sort((a, b) => a.localeCompare(b))
        .forEach((fromColumn) => {
          const toColumn = tableMap[fromColumn]
          if (!diff.addedColumns.some((added) => added.table === table && added.column === toColumn)) {
            return
          }
          // Copy values from old column to the new one after addColumns() set defaults.
          const sql = `update "${table}" set "${toColumn}" = "${fromColumn}" where "${toColumn}" is null;`
          steps.push(unsafeExecuteSql(sql))
        })
    })

  return steps
}

export const createSchemaSnapshot = (
  tables: SchemaSnapshotTable[],
  schemaVersion: number,
): SchemaSnapshot => ({
  schemaVersion: Number(schemaVersion || 1),
  generatedAt: new Date().toISOString(),
  tables: [...tables].map(normalizeTable).sort((a, b) => a.table.localeCompare(b.table)),
})

export const planSchemaMigration = (
  previousSnapshot: ?SchemaSnapshot,
  nextSnapshot: SchemaSnapshot,
  options: MigrationOptions = {},
): MigrationPlan => {
  const mode = options.mode || 'smart'
  const detectRename = options.detectRename || 'same-type-one-to-one'
  const explicitRenameMap = options.renameMap || {}

  const previousVersion = Number(previousSnapshot?.schemaVersion || 1)
  const diff = diffSnapshots(previousSnapshot, nextSnapshot)
  const inferredRenameMap = detectRename === 'same-type-one-to-one' ? inferRenameMap(diff) : {}
  const renameMap = mergeRenameMaps(explicitRenameMap, inferredRenameMap)

  const blockedDestructiveChanges = []
  diff.removedTables.forEach((item) => {
    blockedDestructiveChanges.push({
      type: 'removed_table',
      table: item.table,
    })
  })

  diff.removedColumns.forEach((item) => {
    if (!isRemovedColumnCovered(diff, renameMap, item.table, item.column)) {
      blockedDestructiveChanges.push({
        type: 'removed_column',
        table: item.table,
        column: item.column,
      })
    }
  })

  diff.changedColumns.forEach((item) => {
    blockedDestructiveChanges.push({
      type: 'changed_column',
      table: item.table,
      column: item.column,
      before: item.before,
      after: item.after,
    })
  })

  if (mode === 'strict' && diff.hasDestructiveChanges && blockedDestructiveChanges.length > 0) {
    // no-op, strict blocks as-is below
  }

  const steps = buildMigrationSteps(diff, renameMap)
  const nextSchemaVersion = diff.hasChanges ? previousVersion + 1 : previousVersion

  const sqliteMigrations =
    diff.hasChanges && steps.length > 0
      ? schemaMigrations({
          migrations: [
            {
              toVersion: nextSchemaVersion,
              steps,
            },
          ],
        })
      : null

  return {
    hasChanges: diff.hasChanges,
    hasDestructiveChanges: diff.hasDestructiveChanges,
    blockedDestructiveChanges,
    inferredRenameMap,
    renameMap,
    steps,
    sqliteMigrations,
    previousSchemaVersion: previousVersion,
    nextSchemaVersion,
  }
}

export const formatMigrationBlockedError = (blockedChanges: any[]): Error => {
  const lines = blockedChanges.map((item) => {
    if (item.type === 'removed_table') {
      return `- removed table '${item.table}'`
    }
    if (item.type === 'removed_column') {
      return `- removed column '${item.table}.${item.column}'`
    }
    if (item.type === 'changed_column') {
      return `- changed column '${item.table}.${item.column}'`
    }
    return `- ${JSON.stringify(item)}`
  })

  return new Error(
    `[HyperTillDB] Destructive migration changes are blocked.\n` +
      `Provide explicit renameMap entries or use a non-destructive change.\n` +
      lines.join('\n'),
  )
}
