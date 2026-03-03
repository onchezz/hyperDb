// @flow

import * as core from './core'

export {
  defineModel,
  dbModel,
  defineModels,
  normalizeModels,
  string,
  number,
  boolean,
  json,
  relation,
  toSnakeCase,
  createHyperTill,
  createDB,
} from './hypertill'

export { core }

// Transitional aliases to keep import friction low while v2 becomes primary.
export {
  Collection,
  Database,
  Relation,
  Model,
  associations,
  Query,
  tableName,
  columnName,
  appSchema,
  tableSchema,
  localStorageKey,
  createReactiveClient,
  uuidv4,
  setIdGenerator,
  useUuidV4IdGenerator,
  Q,
} from './core'

export type {
  CollectionMap,
  LocalStorageKey,
  DatabaseAdapter,
  RawRecord,
  DirtyRaw,
  RecordId,
  TableName,
  ColumnName,
  ColumnType,
  ColumnSchema,
  TableSchema,
  AppSchema,
  SchemaMigrations,
  ReactiveClient,
  ReactiveClientOptions,
  ReactiveTableQuery,
  ReactiveResponse,
  ReactiveOrderOptions,
  ReactiveUpsertOptions,
  IdGenerator,
} from './core'

export type {
  RelationDescriptor,
  DBModelOptions,
  DBModel,
  DefinedModelEntry,
  DefinedModels,
  MutationProgress,
  MutationResult,
  CreateDBOptions,
  ModelDefinition,
  ModelField,
  FieldBuilder,
  InternalFieldSpec,
  HyperTillClient,
  HyperTillModelApi,
  QueryConfig,
  CreateHyperTillOptions,
} from './hypertill'
