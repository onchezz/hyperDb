import type { ReactiveClient, ReactiveResponse, ReactiveUpsertOptions } from '../reactive'
import type { ReactiveHookState } from '../reactive/react'
import type { FieldBuilder } from '../modeling'
import type { ModelDefinition, InferModelInput } from '../modeling'

export type Scalar = string | number | boolean | null
export type JsonValue = Scalar | JsonValue[] | { [key: string]: JsonValue }
export type RowShape = { [key: string]: JsonValue | undefined }

export type RelationDescriptor = {
  readonly __hypertillRelation: true
  readonly targetName: string
  readonly foreignKey: string | null
}

export type DBModelOptions = {
  table?: string
  deleteMode?: 'soft' | 'hard'
  timestamps?: boolean
  __typeMeta?: {
    fields: Record<
      string,
      {
        kind: 'string' | 'number' | 'boolean' | 'json'
        optional?: boolean
        indexed?: boolean
        hasDefault?: boolean
        defaultValue?: JsonValue
        relationTable?: string
      }
    >
  }
}

export type DBModel<Row extends RowShape> = {
  readonly __hypertillDbModel: true
  readonly relations: ReadonlyArray<RelationDescriptor>
  readonly options: DBModelOptions
  readonly __row?: Row
}

type DBModelMap = { [name: string]: DBModel<RowShape> }

export declare function dbModel<Row extends RowShape>(
  ...args: ReadonlyArray<RelationDescriptor | DBModelOptions | ReadonlyArray<RelationDescriptor>>
): DBModel<Row>

export type DefinedModelEntry = {
  readonly name: string
  readonly table: string
  readonly deleteMode: 'soft' | 'hard'
  readonly timestamps: boolean
  readonly columns: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'json'
      indexed: boolean
      optional: boolean
    }
  >
  readonly relations: ReadonlyArray<{
    readonly targetName: string
    readonly targetTable: string
    readonly foreignKey: string
    readonly fieldName: string
    readonly optional: boolean
    readonly indexed: boolean
  }>
}

export type DefinedModels<Models extends DBModelMap = DBModelMap> = {
  readonly __hypertillDefinedModels: true
  readonly entries: ReadonlyArray<DefinedModelEntry>
  readonly models: ReadonlyArray<{
    readonly table: string
    readonly name: string
    readonly fields: ReadonlyArray<{
      readonly name: string
      readonly columnName: string
      readonly kind: 'string' | 'number' | 'boolean' | 'json' | 'relation'
      readonly optional: boolean
      readonly indexed: boolean
      readonly hasDefault: boolean
      readonly relationTable: string | null
    }>
  }>
  readonly byName: { [Name in keyof Models & string]: DefinedModelEntry }
  readonly byTable: { [table: string]: DefinedModelEntry }
}

export declare function defineModels<Models extends DBModelMap>(models: Models): DefinedModels<Models>
export declare function isDefinedModels(value: object): value is DefinedModels

export type RelationHelper = {
  (table: string): FieldBuilder
  to(targetName: string, foreignKey?: string): RelationDescriptor
} & {
  [name: string]:
    | ((foreignKey?: string) => RelationDescriptor)
    | ((table: string) => FieldBuilder)
    | ((targetName: string, foreignKey?: string) => RelationDescriptor)
    | string
}

export declare const relation: RelationHelper

export type SystemColumns = {
  id: string
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export type WithSystemColumns<Row extends RowShape> = Row & SystemColumns

export type QueryConfig<Row extends RowShape> = {
  select?: ReadonlyArray<keyof WithSystemColumns<Row> & string> | '*'
  where?: Partial<WithSystemColumns<Row>>
  orderBy?: { column: keyof WithSystemColumns<Row> & string; ascending?: boolean }
  limit?: number
  range?: [number, number]
}

export type MutationProgress = {
  current: number
  total: number
  percent: number
}

export type MutationResult<T> = {
  data: T | null
  error: Error | null
  loading: false
  status: 'success' | 'error'
  progress: MutationProgress
}

export type SchemaSnapshotColumn = {
  name: string
  type: 'string' | 'number' | 'boolean'
  isIndexed: boolean
  isOptional: boolean
}

export type SchemaSnapshotTable = {
  table: string
  columns: ReadonlyArray<SchemaSnapshotColumn>
}

export type SchemaSnapshot = {
  schemaVersion: number
  generatedAt: string
  tables: ReadonlyArray<SchemaSnapshotTable>
}

export type MigrationBlockedChange =
  | { type: 'removed_table'; table: string }
  | { type: 'removed_column'; table: string; column: string }
  | { type: 'changed_column'; table: string; column: string }

export type MigrationPlan = {
  hasChanges: boolean
  hasDestructiveChanges: boolean
  blockedDestructiveChanges: ReadonlyArray<MigrationBlockedChange>
  inferredRenameMap: Record<string, Record<string, string>>
  renameMap: Record<string, Record<string, string>>
  steps: ReadonlyArray<object>
  sqliteMigrations: object | null
  previousSchemaVersion: number
  nextSchemaVersion: number
}

export type MigrationOptions = {
  mode?: 'strict' | 'smart'
  autoDefaults?: boolean
  detectRename?: 'none' | 'same-type-one-to-one'
  renameMap?: Record<string, Record<string, string>>
  previousSnapshot?: SchemaSnapshot
  onSnapshot?: (snapshot: SchemaSnapshot) => void
}

export type ModelAPI<Row extends RowShape> = {
  table: string
  query(config?: QueryConfig<Row>): object
  fetch(config?: QueryConfig<Row>): Promise<ReactiveResponse<WithSystemColumns<Row>[]>>
  subscribe(config: QueryConfig<Row>, listener: (payload: ReactiveResponse<WithSystemColumns<Row>[]>) => void): () => void
  create(values: Row): Promise<MutationResult<WithSystemColumns<Row>>>
  createMany(values: ReadonlyArray<Row>): Promise<MutationResult<WithSystemColumns<Row>[]>>
  update(id: string, values: Partial<Row>): Promise<MutationResult<WithSystemColumns<Row>>>
  patch(where: Partial<WithSystemColumns<Row>>, values: Partial<Row>): Promise<ReactiveResponse<WithSystemColumns<Row>[]>>
  remove(where: Partial<WithSystemColumns<Row>>): Promise<ReactiveResponse<WithSystemColumns<Row>[]>>
  delete(id: string, options?: { mode?: 'soft' | 'hard' }): Promise<MutationResult<WithSystemColumns<Row>>>
  upsert(
    values: Row | ReadonlyArray<Row>,
    options?: ReactiveUpsertOptions,
  ): Promise<MutationResult<WithSystemColumns<Row>[]>>
  useList(
    config?: QueryConfig<Row>,
    deps?: ReadonlyArray<string | number | boolean | null | undefined>,
  ): ReactiveHookState<WithSystemColumns<Row>[]>
  useById(
    id: string,
    deps?: ReadonlyArray<string | number | boolean | null | undefined>,
  ): ReactiveHookState<WithSystemColumns<Row> | null>
}

type ModelRow<ModelDef> = ModelDef extends DBModel<infer Row> ? Row : never
type TableKey<Name extends string> = `${Lowercase<Name>}s`

type ModelAPIs<Models extends DBModelMap> = {
  [Name in keyof Models & string as TableKey<Name>]: ModelAPI<ModelRow<Models[Name]>>
}

type RootHooks<Models extends DBModelMap> = {
  [Name in keyof Models & string as `use${Name}s`]: (
    config?: QueryConfig<ModelRow<Models[Name]>>,
    deps?: ReadonlyArray<string | number | boolean | null | undefined>,
  ) => ReactiveHookState<WithSystemColumns<ModelRow<Models[Name]>>[]>
} & {
  [Name in keyof Models & string as `use${Name}ById`]: (
    id: string,
    deps?: ReadonlyArray<string | number | boolean | null | undefined>,
  ) => ReactiveHookState<WithSystemColumns<ModelRow<Models[Name]>> | null>
}

export type DBClient<Models extends DBModelMap> = ModelAPIs<Models> &
  RootHooks<Models> & {
    name: string | null
    database: object
    schema: object | null
    migration: MigrationPlan | null
    snapshot: SchemaSnapshot | null
    reactive: ReactiveClient
    events: {
      emit(eventName: string, payload?: JsonValue): void
      on(eventName: string, handler: (payload: JsonValue | undefined) => void): () => void
      off(eventName: string, handler: (payload: JsonValue | undefined) => void): void
      clear(): void
    }
    models: ReadonlyArray<{
      table: string
      name: string
      fields: ReadonlyArray<{
        name: string
        columnName: string
        kind: 'string' | 'number' | 'boolean' | 'json' | 'relation'
        optional: boolean
        indexed: boolean
        hasDefault: boolean
        relationTable: string | null
      }>
    }>
    registry: DefinedModels<Models>
    getModel(tableOrName: string): ModelAPI<RowShape>
  }

export type CreateDBOptions<Models extends DBModelMap> = {
  name?: string
  database?: object
  models: Models | DefinedModels<Models>
  schemaVersion?: number
  platform?: 'auto' | 'native' | 'web'
  native?: {
    dbName?: string
    jsi?: boolean
    onSetUpError?: (error: unknown) => void
  }
  web?: {
    dbName?: string
    useWebWorker?: boolean
    useIncrementalIndexedDB?: boolean
    onSetUpError?: (error: Error) => void
  }
  migration?: MigrationOptions
  reactiveOptions?: { idGenerator?: () => string }
}

export declare function createDB<Models extends DBModelMap>(options: CreateDBOptions<Models>): DBClient<Models>

type SchemaModelArray = ReadonlyArray<ModelDefinition<any, any>>
type SchemaTableAPIs<SchemaModels extends SchemaModelArray> = {
  [M in SchemaModels[number] as M['table']]: ModelAPI<InferModelInput<M>>
}

export type SchemaDBClient<SchemaModels extends SchemaModelArray> = SchemaTableAPIs<SchemaModels> & {
  name: string | null
  database: object
  schema: object | null
  migration: MigrationPlan | null
  snapshot: SchemaSnapshot | null
  reactive: ReactiveClient
  events: {
    emit(eventName: string, payload?: JsonValue): void
    on(eventName: string, handler: (payload: JsonValue | undefined) => void): () => void
    off(eventName: string, handler: (payload: JsonValue | undefined) => void): void
    clear(): void
  }
  models: ReadonlyArray<{
    table: string
    name: string
    fields: ReadonlyArray<{
      name: string
      columnName: string
      kind: 'string' | 'number' | 'boolean' | 'json' | 'relation'
      optional: boolean
      indexed: boolean
      hasDefault: boolean
      relationTable: string | null
    }>
  }>
  registry: DefinedModels<DBModelMap>
  getModel(tableOrName: string): ModelAPI<RowShape>
}

export type CreateSchemaDBOptions<SchemaModels extends SchemaModelArray> = {
  name?: string
  database?: object
  models: SchemaModels
  schemaVersion?: number
  platform?: 'auto' | 'native' | 'web'
  native?: {
    dbName?: string
    jsi?: boolean
    onSetUpError?: (error: unknown) => void
  }
  web?: {
    dbName?: string
    useWebWorker?: boolean
    useIncrementalIndexedDB?: boolean
    onSetUpError?: (error: Error) => void
  }
  migration?: MigrationOptions
  reactiveOptions?: { idGenerator?: () => string }
}

export declare function createDB<SchemaModels extends SchemaModelArray>(
  options: CreateSchemaDBOptions<SchemaModels>,
): SchemaDBClient<SchemaModels>

export declare function createSchemaSnapshot(
  tables: ReadonlyArray<SchemaSnapshotTable>,
  schemaVersion: number,
): SchemaSnapshot

export declare function planSchemaMigration(
  previousSnapshot: SchemaSnapshot | null | undefined,
  nextSnapshot: SchemaSnapshot,
  options?: MigrationOptions,
): MigrationPlan

export declare function formatMigrationBlockedError(blockedChanges: ReadonlyArray<MigrationBlockedChange>): Error
