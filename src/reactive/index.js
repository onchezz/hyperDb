// @flow

import { invariant } from '../utils/common'
import { map, type Observable } from '../utils/rx'
import type { Unsubscribe } from '../utils/subscriptions'
import randomId from '../utils/common/randomId'

import type Database from '../Database'
import type Collection from '../Collection'
import type Model from '../Model'
import type Query from '../Query'
import type { TableName } from '../Schema'
import { columnName } from '../Schema'
import * as Q from '../QueryDescription'
import type { Clause, Value, NonNullValues } from '../QueryDescription'

export type ReactiveResponse<T> = $Exact<{
  data: ?T,
  error: ?Error,
}>

export type ReactiveOrderOptions = $Exact<{
  ascending?: boolean,
}>

export type ReactiveSearchOptions = $Exact<{
  mode?: 'contains' | 'startsWith' | 'like',
}>

export type ReactiveUpsertOptions = $Exact<{
  onConflict?: string | string[],
}>

export type ReactiveClientOptions = $Exact<{
  idGenerator?: () => string,
}>

type SelectColumns = null | string[]
type RowObject = { [string]: any }

const RESERVED_RAW_COLUMNS = ['_status', '_changed']
const IMMUTABLE_COLUMNS = ['id', '_status', '_changed']

const successResponse = <T>(data: T): ReactiveResponse<T> => ({ data, error: null })
const errorResponse = <T>(error: Error): ReactiveResponse<T> => ({ data: null, error })

const isObject = (value: any): boolean => !!value && typeof value === 'object' && !Array.isArray(value)

const parseSelectColumns = (columns: string | string[] | void): SelectColumns => {
  if (!columns || columns === '*') {
    return null
  }
  const parsed = Array.isArray(columns) ? columns : columns.split(',')
  const normalized = parsed.map((column) => column.trim()).filter(Boolean)
  if (!normalized.length || normalized.includes('*')) {
    return null
  }
  return Array.from(new Set(normalized))
}

const parseSearchColumns = (columns: string | string[] | void): string[] => {
  if (!columns) {
    return []
  }
  const parsed = Array.isArray(columns) ? columns : columns.split(',')
  return Array.from(
    new Set(
      parsed
        .map((column) => column.trim())
        .filter(Boolean),
    ),
  )
}

const normalizeRows = (values: RowObject | RowObject[], action: string): RowObject[] => {
  const rows = Array.isArray(values) ? values : [values]
  invariant(rows.length > 0, `[Reactive] ${action} expects at least one row`)
  rows.forEach((row, idx) => {
    invariant(isObject(row), `[Reactive] ${action} expects plain object rows (row ${idx + 1})`)
  })
  return rows
}

const normalizePatch = (values: RowObject, action: string): RowObject => {
  invariant(isObject(values), `[Reactive] ${action} expects a plain object`)
  const keys = Object.keys(values)
  invariant(keys.length > 0, `[Reactive] ${action} expects at least one column value`)
  keys.forEach((key) => {
    invariant(!IMMUTABLE_COLUMNS.includes(key), `[Reactive] ${action} cannot modify '${key}'`)
  })
  return values
}

const rawToRow = (raw: RowObject, selectedColumns: SelectColumns): RowObject => {
  const columns =
    selectedColumns || Object.keys(raw).filter((column) => !RESERVED_RAW_COLUMNS.includes(column))
  return columns.reduce<RowObject>((row, column) => {
    row[column] = raw[column]
    return row
  }, {})
}

const recordsToRows = (records: Model[], selectedColumns: SelectColumns): RowObject[] =>
  // $FlowFixMe
  records.map((record) => rawToRow(record._raw, selectedColumns))

const stripImmutableColumns = (row: RowObject): RowObject =>
  Object.keys(row).reduce((next, key) => {
    if (!IMMUTABLE_COLUMNS.includes(key)) {
      next[key] = row[key]
    }
    return next
  }, ({}: RowObject))

const applyPatchToRecord = (record: Model, values: RowObject): void => {
  Object.keys(values).forEach((key) => {
    // $FlowFixMe
    record._setRaw(columnName(key), values[key])
  })
}

const findByIdOrNull = async (collection: Collection<Model>, id: string): Promise<?Model> => {
  try {
    return await collection.find(id)
  } catch (_error) {
    return null
  }
}

class ReactiveTableQuery {
  _collection: Collection<Model>
  _clauses: Clause[]
  _selectedColumns: SelectColumns
  _idGenerator: () => string

  constructor(
    collection: Collection<Model>,
    clauses: Clause[] = [],
    selectedColumns: SelectColumns = null,
    idGenerator: () => string = randomId,
  ): void {
    this._collection = collection
    this._clauses = clauses
    this._selectedColumns = selectedColumns
    this._idGenerator = idGenerator
  }

  _clone({
    clauses,
    selectedColumns,
  }: { clauses?: Clause[], selectedColumns?: SelectColumns } = {}): ReactiveTableQuery {
    return new ReactiveTableQuery(
      this._collection,
      clauses || this._clauses,
      selectedColumns === undefined ? this._selectedColumns : selectedColumns,
      this._idGenerator,
    )
  }

  _appendClause(clause: Clause): ReactiveTableQuery {
    return this._clone({ clauses: this._clauses.concat([clause]) })
  }

  _query(): Query<Model> {
    return this._collection.query(this._clauses)
  }

  _rowsFromRecords(records: Model[]): RowObject[] {
    return recordsToRows(records, this._selectedColumns)
  }

  _ensureRowId(row: RowObject): RowObject {
    if (typeof row.id === 'string') {
      return row
    }
    return { ...row, id: this._idGenerator() }
  }

  select(columns?: string | string[]): ReactiveTableQuery {
    return this._clone({ selectedColumns: parseSelectColumns(columns) })
  }

  eq(column: string, value: Value): ReactiveTableQuery {
    return this._appendClause(Q.where(columnName(column), value))
  }

  neq(column: string, value: Value): ReactiveTableQuery {
    return this._appendClause(Q.where(columnName(column), Q.notEq(value)))
  }

  gt(column: string, value: number | string | boolean): ReactiveTableQuery {
    return this._appendClause(Q.where(columnName(column), Q.gt(value)))
  }

  gte(column: string, value: number | string | boolean): ReactiveTableQuery {
    return this._appendClause(Q.where(columnName(column), Q.gte(value)))
  }

  lt(column: string, value: number | string | boolean): ReactiveTableQuery {
    return this._appendClause(Q.where(columnName(column), Q.lt(value)))
  }

  lte(column: string, value: number | string | boolean): ReactiveTableQuery {
    return this._appendClause(Q.where(columnName(column), Q.lte(value)))
  }

  in(column: string, values: NonNullValues): ReactiveTableQuery {
    return this._appendClause(Q.where(columnName(column), Q.oneOf(values)))
  }

  like(column: string, value: string): ReactiveTableQuery {
    invariant(typeof value === 'string', `[Reactive] like() expects a string value`)
    return this._appendClause(Q.where(columnName(column), Q.like(value)))
  }

  contains(column: string, value: string): ReactiveTableQuery {
    invariant(typeof value === 'string', `[Reactive] contains() expects a string value`)
    const safe = Q.sanitizeLikeString(value)
    return this._appendClause(Q.where(columnName(column), Q.like(`%${safe}%`)))
  }

  startsWith(column: string, value: string): ReactiveTableQuery {
    invariant(typeof value === 'string', `[Reactive] startsWith() expects a string value`)
    const safe = Q.sanitizeLikeString(value)
    return this._appendClause(Q.where(columnName(column), Q.like(`${safe}%`)))
  }

  search(
    value: string,
    columns: string | string[],
    options: ReactiveSearchOptions = {},
  ): ReactiveTableQuery {
    invariant(typeof value === 'string', `[Reactive] search() expects a string value`)
    const normalizedColumns = parseSearchColumns(columns)
    if (!normalizedColumns.length) {
      return this
    }

    const mode = options.mode || 'contains'
    let comparison
    if (mode === 'like') {
      comparison = Q.like(value)
    } else if (mode === 'startsWith') {
      comparison = Q.like(`${Q.sanitizeLikeString(value)}%`)
    } else {
      comparison = Q.like(`%${Q.sanitizeLikeString(value)}%`)
    }

    const clauses = normalizedColumns.map((column) =>
      Q.where(columnName(column), comparison),
    )
    if (clauses.length === 1) {
      return this._appendClause(clauses[0])
    }
    return this._appendClause(Q.or(...clauses))
  }

  match(values: RowObject): ReactiveTableQuery {
    invariant(isObject(values), `[Reactive] match() expects a plain object`)
    return Object.keys(values).reduce(
      (query, column) => query.eq(column, values[column]),
      (this: ReactiveTableQuery),
    )
  }

  order(column: string, options: ReactiveOrderOptions = {}): ReactiveTableQuery {
    const sortOrder = options.ascending === false ? Q.desc : Q.asc
    return this._appendClause(Q.sortBy(columnName(column), sortOrder))
  }

  limit(count: number): ReactiveTableQuery {
    return this._appendClause(Q.take(count))
  }

  range(from: number, to: number): ReactiveTableQuery {
    invariant(from >= 0 && to >= from, `[Reactive] range() expects 0 <= from <= to`)
    return this._clone({
      clauses: this._clauses.concat([Q.skip(from), Q.take(to - from + 1)]),
    })
  }

  async fetch(): Promise<ReactiveResponse<RowObject[]>> {
    try {
      const records = await this._query().fetch()
      return successResponse(this._rowsFromRecords(records))
    } catch (error) {
      return errorResponse((error: any))
    }
  }

  async single(): Promise<ReactiveResponse<RowObject>> {
    const response = await this.fetch()
    if (response.error) {
      return errorResponse(response.error)
    }
    const rows = response.data || []
    if (rows.length !== 1) {
      return errorResponse(
        new Error(`[Reactive] Expected a single row, but received ${rows.length} rows`),
      )
    }
    return successResponse(rows[0])
  }

  async maybeSingle(): Promise<ReactiveResponse<?RowObject>> {
    const response = await this.fetch()
    if (response.error) {
      return errorResponse(response.error)
    }
    const rows = response.data || []
    if (rows.length > 1) {
      return errorResponse(
        new Error(`[Reactive] Expected zero or one row, but received ${rows.length} rows`),
      )
    }
    return successResponse(rows[0] || null)
  }

  observe(): Observable<ReactiveResponse<RowObject[]>> {
    return this._query().observe().pipe(map((records) => successResponse(this._rowsFromRecords(records))))
  }

  subscribe(subscriber: (ReactiveResponse<RowObject[]>) => void): Unsubscribe {
    return this._query().experimentalSubscribe((records) => {
      subscriber(successResponse(this._rowsFromRecords(records)))
    })
  }

  async insert(values: RowObject | RowObject[]): Promise<ReactiveResponse<RowObject[]>> {
    const rows = normalizeRows(values, 'insert()').map((row) => this._ensureRowId(row))
    try {
      let insertedRecords = []
      await this._collection.database.write(async () => {
        insertedRecords = rows.map((row) => this._collection.prepareCreateFromDirtyRaw(row))
        await this._collection.database.batch(insertedRecords)
      })
      return successResponse(this._rowsFromRecords(insertedRecords))
    } catch (error) {
      return errorResponse((error: any))
    }
  }

  async update(values: RowObject): Promise<ReactiveResponse<RowObject[]>> {
    const patch = normalizePatch(values, 'update()')
    try {
      let updatedRecords = []
      await this._collection.database.write(async () => {
        updatedRecords = await this._query().fetch()
        const prepared = updatedRecords.map((record) =>
          record.prepareUpdate((editingRecord) => {
            applyPatchToRecord(editingRecord, patch)
          }),
        )
        if (prepared.length) {
          await this._collection.database.batch(prepared)
        }
      })
      return successResponse(this._rowsFromRecords(updatedRecords))
    } catch (error) {
      return errorResponse((error: any))
    }
  }

  async delete(): Promise<ReactiveResponse<RowObject[]>> {
    try {
      let deletedRows = []
      await this._collection.database.write(async () => {
        const records = await this._query().fetch()
        deletedRows = this._rowsFromRecords(records)
        const prepared = records.map((record) => record.prepareMarkAsDeleted())
        if (prepared.length) {
          await this._collection.database.batch(prepared)
        }
      })
      return successResponse(deletedRows)
    } catch (error) {
      return errorResponse((error: any))
    }
  }

  async upsert(
    values: RowObject | RowObject[],
    options: ReactiveUpsertOptions = {},
  ): Promise<ReactiveResponse<RowObject[]>> {
    const rows = normalizeRows(values, 'upsert()').map((row) => this._ensureRowId(row))
    const onConflict = options.onConflict
    if (onConflict) {
      const normalizedConflict = Array.isArray(onConflict) ? onConflict : [onConflict]
      invariant(
        normalizedConflict.length === 1 && normalizedConflict[0] === 'id',
        `[Reactive] upsert() currently supports onConflict: 'id' only`,
      )
    }

    try {
      let touchedRecords = []
      await this._collection.database.write(async () => {
        const preparedRecords = []
        for (const row of rows) {
          const recordId = row.id
          if (typeof recordId === 'string') {
            const existingRecord = await findByIdOrNull(this._collection, recordId)
            if (existingRecord) {
              const patch = stripImmutableColumns(row)
              if (Object.keys(patch).length) {
                existingRecord.prepareUpdate((editingRecord) => {
                  applyPatchToRecord(editingRecord, patch)
                })
                preparedRecords.push(existingRecord)
              }
              touchedRecords.push(existingRecord)
              // eslint-disable-next-line no-continue
              continue
            }
          }
          const createdRecord = this._collection.prepareCreateFromDirtyRaw(row)
          preparedRecords.push(createdRecord)
          touchedRecords.push(createdRecord)
        }

        if (preparedRecords.length) {
          await this._collection.database.batch(preparedRecords)
        }
      })

      return successResponse(this._rowsFromRecords(touchedRecords))
    } catch (error) {
      return errorResponse((error: any))
    }
  }
}

export type ReactiveClient = $Exact<{
  from: (tableName: TableName<any> | string) => ReactiveTableQuery,
}>

export function createReactiveClient(
  database: Database,
  options: ReactiveClientOptions = {},
): ReactiveClient {
  invariant(database, `[Reactive] Missing database passed to createReactiveClient()`)
  const idGenerator = options.idGenerator || randomId
  return {
    from: (tableName: TableName<any> | string) => {
      // $FlowFixMe[incompatible-call]
      const collection: Collection<Model> = database.get((tableName: any))
      return new ReactiveTableQuery(collection, [], null, idGenerator)
    },
  }
}

export type { ReactiveTableQuery }
