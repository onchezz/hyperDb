export type FieldKind = 'string' | 'number' | 'boolean' | 'json' | 'relation'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type InternalFieldSpec = {
  kind: FieldKind
  optional: boolean
  indexed: boolean
  hasDefault: boolean
  defaultValue: unknown
  relationTable: string | null
  foreignKey: string | null
}

export interface FieldBuilder<Value = unknown, Optional extends boolean = false> {
  __hypertillField: true
  optional(): FieldBuilder<Value, true>
  indexed(): FieldBuilder<Value, Optional>
  default(value: Value): FieldBuilder<Value, Optional>
  foreignKey(columnName: string): FieldBuilder<Value, Optional>
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

export type ModelDefinition<
  TTable extends string = string,
  TFields extends Record<string, FieldBuilder<any, any> | InternalFieldSpec> = Record<
    string,
    FieldBuilder<any, any> | InternalFieldSpec
  >,
> = {
  table: TTable
  name: string
  fields: ReadonlyArray<ModelField>
  __fields?: TFields
}

type FieldValue<TField> = TField extends FieldBuilder<infer TValue, any> ? TValue : unknown
type OptionalFieldNames<TFields extends Record<string, FieldBuilder<any, any> | InternalFieldSpec>> = {
  [K in keyof TFields]: TFields[K] extends FieldBuilder<any, infer Optional>
    ? Optional extends true
      ? K
      : never
    : never
}[keyof TFields]
type RequiredFieldNames<TFields extends Record<string, FieldBuilder<any, any> | InternalFieldSpec>> = Exclude<
  keyof TFields,
  OptionalFieldNames<TFields>
>

export type InferModelInput<M extends ModelDefinition<any, any>> = M extends ModelDefinition<any, infer TFields>
  ? {
      [K in RequiredFieldNames<TFields>]: FieldValue<TFields[K]>
    } & {
      [K in OptionalFieldNames<TFields>]?: FieldValue<TFields[K]>
    }
  : never

export type InferModelRow<M extends ModelDefinition<any, any>> = InferModelInput<M> & {
  id: string
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export declare function defineModel<
  TTable extends string,
  TFields extends Record<string, FieldBuilder<any, any> | InternalFieldSpec>,
>(
  table: TTable,
  fields: TFields,
  options?: { name?: string },
): ModelDefinition<TTable, TFields>

export declare function normalizeModels(models: ModelDefinition<any, any>[]): ModelDefinition<any, any>[]
export declare function toSnakeCase(value: string): string

export declare function string(): FieldBuilder<string, false>
export declare function number(): FieldBuilder<number, false>
export declare function boolean(): FieldBuilder<boolean, false>
export declare function json<T extends JsonValue = JsonValue>(): FieldBuilder<T, false>
export declare function relation(table: string): FieldBuilder<string, false>
export declare function isFieldBuilder(value: unknown): value is FieldBuilder<any, any>
