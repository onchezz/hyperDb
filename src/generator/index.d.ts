export type GenerateOptions = {
  cwd?: string
  modelsPath?: string
  outDir?: string
  migrationMapPath?: string
  snapshotPath?: string
  migrationsDir?: string
  logger?: (message: string) => void
}

export type GenerateResult = {
  changedFiles: string[]
  snapshotPath: string
  schemaVersion: number
  hasChanges: boolean
}

export declare function generate(options?: GenerateOptions): GenerateResult

export default generate
