export type MigrationMap = {
  renameTables?: Record<string, string>
  renameColumns?: Record<string, Record<string, string>>
}

export type SnapshotDiff = {
  addedTables: Array<{ table: string; model: any }>
  removedTables: Array<{ table: string; model: any }>
  addedColumns: Array<{ table: string; column: string; after?: any }>
  removedColumns: Array<{ table: string; column: string; before?: any }>
  changedColumns: Array<{ table: string; column: string; before?: any; after?: any; reason?: string }>
  hasChanges: boolean
  hasDestructiveChanges: boolean
}
