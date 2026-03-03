// @noflow
/* eslint-disable no-undef */

import { invariant } from '../utils/common'

export type PrimitiveFieldKind = 'string' | 'number' | 'boolean' | 'json'
export type FieldKind = PrimitiveFieldKind | 'relation'

export type InternalFieldSpec = $ReadOnly<{
  kind: FieldKind,
  optional: boolean,
  indexed: boolean,
  hasDefault: boolean,
  defaultValue: mixed,
  relationTable: ?string,
  foreignKey: ?string,
}>

export type FieldBuilder = {
  __hypertillField: true,
  optional: () => FieldBuilder,
  indexed: () => FieldBuilder,
  default: (value: mixed) => FieldBuilder,
  foreignKey: (columnName: string) => FieldBuilder,
  describe: () => InternalFieldSpec,
}

const createFieldBuilder = (spec: InternalFieldSpec): FieldBuilder => {
  const freezeSpec = Object.freeze({ ...spec })

  const builder: FieldBuilder = {
    __hypertillField: true,
    optional: () =>
      createFieldBuilder({
        ...freezeSpec,
        optional: true,
      }),
    indexed: () =>
      createFieldBuilder({
        ...freezeSpec,
        indexed: true,
      }),
    default: (value: mixed) =>
      createFieldBuilder({
        ...freezeSpec,
        hasDefault: true,
        defaultValue: value,
      }),
    foreignKey: (columnName: string) => {
      invariant(freezeSpec.kind === 'relation', `[HyperTillDB] foreignKey() is only valid for relation fields`)
      invariant(!!columnName && typeof columnName === 'string', `[HyperTillDB] foreignKey() requires a string column name`)
      return createFieldBuilder({
        ...freezeSpec,
        foreignKey: columnName,
      })
    },
    describe: () => freezeSpec,
  }

  return Object.freeze(builder)
}

const base = (kind: PrimitiveFieldKind): FieldBuilder =>
  createFieldBuilder({
    kind,
    optional: false,
    indexed: false,
    hasDefault: false,
    defaultValue: undefined,
    relationTable: null,
    foreignKey: null,
  })

export const string = (): FieldBuilder => base('string')
export const number = (): FieldBuilder => base('number')
export const boolean = (): FieldBuilder => base('boolean')
export const json = (): FieldBuilder => base('json')

export const relation = (table: string): FieldBuilder => {
  invariant(!!table && typeof table === 'string', `[HyperTillDB] relation() requires a target table name`)
  return createFieldBuilder({
    kind: 'relation',
    optional: false,
    indexed: true,
    hasDefault: false,
    defaultValue: undefined,
    relationTable: table,
    foreignKey: null,
  })
}

export const isFieldBuilder = (value: mixed): boolean =>
  !!value && typeof value === 'object' && value.__hypertillField === true &&
  typeof value.describe === 'function'

export const normalizeFieldSpec = (value: mixed): InternalFieldSpec => {
  if (isFieldBuilder(value)) {
    // $FlowFixMe[prop-missing]
    return value.describe()
  }

  const anyValue: any = value
  if (anyValue && typeof anyValue === 'object' && typeof anyValue.kind === 'string') {
    return {
      kind: anyValue.kind,
      optional: !!anyValue.optional,
      indexed: !!anyValue.indexed,
      hasDefault: !!anyValue.hasDefault,
      defaultValue: anyValue.defaultValue,
      relationTable: anyValue.relationTable || null,
      foreignKey: anyValue.foreignKey || null,
    }
  }

  throw new Error('[HyperTillDB] Invalid field definition. Use string(), number(), boolean(), json(), or relation().')
}
