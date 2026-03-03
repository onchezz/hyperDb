// @noflow

export type FieldDiff = {
  table: string,
  column: string,
  before?: any,
  after?: any,
  reason?: string,
}

export type SnapshotDiff = {
  addedTables: Array<{ table: string, model: any }>,
  removedTables: Array<{ table: string, model: any }>,
  addedColumns: FieldDiff[],
  removedColumns: FieldDiff[],
  changedColumns: FieldDiff[],
  hasChanges: boolean,
  hasDestructiveChanges: boolean,
}

const toTableMap = (snapshot: any): Map<string, any> =>
  new Map((snapshot?.models || []).map((model) => [model.table, model]))

const toFieldMap = (model: any): Map<string, any> =>
  new Map((model.fields || []).map((field) => [field.columnName, field]))

const hasFieldChanged = (before: any, after: any): boolean => {
  if (before.kind !== after.kind) {
    return true
  }
  if (!!before.optional !== !!after.optional) {
    return true
  }
  if (!!before.indexed !== !!after.indexed) {
    return true
  }
  if (!!before.hasDefault !== !!after.hasDefault) {
    return true
  }
  if (before.relationTable !== after.relationTable) {
    return true
  }
  if (before.hasDefault) {
    return JSON.stringify(before.defaultValue) !== JSON.stringify(after.defaultValue)
  }
  return false
}

export const diffSnapshots = (previousSnapshot: ?any, nextSnapshot: any): SnapshotDiff => {
  const addedTables = []
  const removedTables = []
  const addedColumns = []
  const removedColumns = []
  const changedColumns = []

  const prevTables = toTableMap(previousSnapshot)
  const nextTables = toTableMap(nextSnapshot)

  nextTables.forEach((nextModel, table) => {
    const prevModel = prevTables.get(table)
    if (!prevModel) {
      addedTables.push({ table, model: nextModel })
      return
    }

    const prevFields = toFieldMap(prevModel)
    const nextFields = toFieldMap(nextModel)

    nextFields.forEach((after, column) => {
      const before = prevFields.get(column)
      if (!before) {
        addedColumns.push({ table, column, after })
        return
      }
      if (hasFieldChanged(before, after)) {
        changedColumns.push({
          table,
          column,
          before,
          after,
          reason: 'column_definition_changed',
        })
      }
    })

    prevFields.forEach((before, column) => {
      if (!nextFields.has(column)) {
        removedColumns.push({ table, column, before })
      }
    })
  })

  prevTables.forEach((prevModel, table) => {
    if (!nextTables.has(table)) {
      removedTables.push({ table, model: prevModel })
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
