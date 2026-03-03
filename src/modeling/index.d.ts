export type FieldKind = 'string' | 'number' | 'boolean' | 'json' | 'relation'

export type InternalFieldSpec = {
  kind: FieldKind
  optional: boolean
  indexed: boolean
  hasDefault: boolean
  defaultValue: unknown
  relationTable: string | null
  foreignKey: string | null
}

export interface FieldBuilder {
  __hypertillField: true
  optional(): FieldBuilder
  indexed(): FieldBuilder
  default(value: unknown): FieldBuilder
  foreignKey(columnName: string): FieldBuilder
  describe(): InternalFieldSpec
}

export type ModelField = {
  name: string
  columnName: string
  kind: FieldKind
  optional: boolean
  indexed: boolean
  hasDefault: boolean
  defaultValue: unknown
  relationTable: string | null
}

export type ModelDefinition = {
  table: string
  name: string
  fields: ReadonlyArray<ModelField>
}

export declare function defineModel(
  table: string,
  fields: Record<string, FieldBuilder | InternalFieldSpec>,
  options?: { name?: string },
): ModelDefinition

export declare function normalizeModels(models: ModelDefinition[]): ModelDefinition[]
export declare function toSnakeCase(value: string): string

export declare function string(): FieldBuilder
export declare function number(): FieldBuilder
export declare function boolean(): FieldBuilder
export declare function json(): FieldBuilder
export declare function relation(table: string): FieldBuilder
export declare function isFieldBuilder(value: unknown): boolean
