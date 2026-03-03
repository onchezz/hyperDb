// @noflow

import fs from 'fs'
import { loadModule, resolveExport, stableStringify } from './utils'

export type MigrationMap = {
  renameTables?: { [string]: string },
  renameColumns?: { [string]: { [string]: string } },
}

export type MigrationPlan = {
  shouldWriteMigration: boolean,
  migrationSteps: any[],
  blockedDestructiveChanges: any[],
}

export const loadMigrationMap = (filePath: string): ?MigrationMap => {
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }
  const loaded = resolveExport(loadModule(filePath))
  if (!loaded || typeof loaded !== 'object') {
    throw new Error(
      `[HyperTillDB] Migration map '${filePath}' must export an object with renameTables/renameColumns`,
    )
  }
  return loaded
}

const coversTableRename = (removedTable: string, diff: any, migrationMap: MigrationMap): boolean => {
  const targetTable = migrationMap.renameTables && migrationMap.renameTables[removedTable]
  if (!targetTable) {
    return false
  }
  return diff.addedTables.some((added) => added.table === targetTable)
}

const coversColumnRename = (table: string, removedColumn: string, diff: any, migrationMap: MigrationMap): boolean => {
  const tableMap = migrationMap.renameColumns && migrationMap.renameColumns[table]
  if (!tableMap) {
    return false
  }
  const targetColumn = tableMap[removedColumn]
  if (!targetColumn) {
    return false
  }
  return diff.addedColumns.some((added) => added.table === table && added.column === targetColumn)
}

export const planMigrations = (diff: any, migrationMap: ?MigrationMap): MigrationPlan => {
  const blockedDestructiveChanges = []
  const map = migrationMap || {}

  diff.removedTables.forEach((tableDiff) => {
    if (!coversTableRename(tableDiff.table, diff, map)) {
      blockedDestructiveChanges.push({
        type: 'removed_table',
        table: tableDiff.table,
      })
    }
  })

  diff.removedColumns.forEach((columnDiff) => {
    if (!coversColumnRename(columnDiff.table, columnDiff.column, diff, map)) {
      blockedDestructiveChanges.push({
        type: 'removed_column',
        table: columnDiff.table,
        column: columnDiff.column,
      })
    }
  })

  diff.changedColumns.forEach((columnDiff) => {
    blockedDestructiveChanges.push({
      type: 'changed_column',
      table: columnDiff.table,
      column: columnDiff.column,
      before: columnDiff.before,
      after: columnDiff.after,
    })
  })

  const migrationSteps = []

  diff.addedTables.forEach(({ table, model }) => {
    migrationSteps.push({
      action: 'create_table',
      table,
      columns: model.fields,
    })
  })

  const groupedAddedColumns: { [string]: any[] } = {}
  diff.addedColumns.forEach((columnDiff) => {
    const key = columnDiff.table
    if (!groupedAddedColumns[key]) {
      groupedAddedColumns[key] = []
    }
    groupedAddedColumns[key].push(columnDiff.after)
  })

  Object.keys(groupedAddedColumns)
    .sort((a, b) => a.localeCompare(b))
    .forEach((table) => {
      migrationSteps.push({
        action: 'add_columns',
        table,
        columns: groupedAddedColumns[table],
      })
    })

  return {
    shouldWriteMigration: migrationSteps.length > 0,
    migrationSteps,
    blockedDestructiveChanges,
  }
}

export const formatBlockedChangesError = (blocked: any[], migrationMapPath: string): Error => {
  const details = blocked
    .map((change) => {
      if (change.type === 'removed_table') {
        return `- removed table '${change.table}'`
      }
      if (change.type === 'removed_column') {
        return `- removed column '${change.table}.${change.column}'`
      }
      if (change.type === 'changed_column') {
        return `- changed column '${change.table}.${change.column}' (${stableStringify(change.before)} -> ${stableStringify(
          change.after,
        )})`
      }
      return `- ${stableStringify(change)}`
    })
    .join('\n')

  return new Error(
    `[HyperTillDB] Destructive schema changes detected. Add explicit mappings in '${migrationMapPath}'.\n${details}`,
  )
}
