import type { Observable } from '../utils/rx'
import type { Unsubscribe } from '../utils/subscriptions'
import type Database from '../Database'
import type { TableName } from '../Schema'
import type { Value } from '../QueryDescription'

export type ReactiveResponse<T> = {
  data: T | null
  error: Error | null
}

export type ReactiveOrderOptions = {
  ascending?: boolean
}

export type ReactiveSearchOptions = {
  mode?: 'contains' | 'startsWith' | 'like'
}

export type ReactiveUpsertOptions = {
  onConflict?: string | string[]
}

export type ReactiveClientOptions = {
  idGenerator?: () => string
}

export interface ReactiveTableQuery<Row extends Record<string, any> = Record<string, any>> {
  select(columns?: string | string[]): ReactiveTableQuery<Row>
  eq(column: string, value: Value): ReactiveTableQuery<Row>
  neq(column: string, value: Value): ReactiveTableQuery<Row>
  gt(column: string, value: number | string | boolean): ReactiveTableQuery<Row>
  gte(column: string, value: number | string | boolean): ReactiveTableQuery<Row>
  lt(column: string, value: number | string | boolean): ReactiveTableQuery<Row>
  lte(column: string, value: number | string | boolean): ReactiveTableQuery<Row>
  in(column: string, values: Array<number | string | boolean>): ReactiveTableQuery<Row>
  like(column: string, value: string): ReactiveTableQuery<Row>
  contains(column: string, value: string): ReactiveTableQuery<Row>
  startsWith(column: string, value: string): ReactiveTableQuery<Row>
  search(
    value: string,
    columns: string | string[],
    options?: ReactiveSearchOptions,
  ): ReactiveTableQuery<Row>
  match(values: Record<string, Value>): ReactiveTableQuery<Row>
  order(column: string, options?: ReactiveOrderOptions): ReactiveTableQuery<Row>
  limit(count: number): ReactiveTableQuery<Row>
  range(from: number, to: number): ReactiveTableQuery<Row>

  fetch(): Promise<ReactiveResponse<Row[]>>
  single(): Promise<ReactiveResponse<Row>>
  maybeSingle(): Promise<ReactiveResponse<Row | null>>
  observe(): Observable<ReactiveResponse<Row[]>>
  subscribe(subscriber: (response: ReactiveResponse<Row[]>) => void): Unsubscribe

  insert(values: Row | Row[]): Promise<ReactiveResponse<Row[]>>
  update(values: Partial<Row>): Promise<ReactiveResponse<Row[]>>
  delete(): Promise<ReactiveResponse<Row[]>>
  upsert(values: Row | Row[], options?: ReactiveUpsertOptions): Promise<ReactiveResponse<Row[]>>
}

export type ReactiveClient = {
  from<Row extends Record<string, any> = Record<string, any>>(
    tableName: TableName<any> | string,
  ): ReactiveTableQuery<Row>
}

export function createReactiveClient(
  database: Database,
  options?: ReactiveClientOptions,
): ReactiveClient
