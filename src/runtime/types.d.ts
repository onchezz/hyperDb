import type { ReactiveClient, ReactiveResponse, ReactiveUpsertOptions } from '../reactive'
import type { ModelDefinition } from '../modeling'

export type QueryOperator = {
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'like'
  value: unknown
}

export type QuerySearch = {
  value: string
  columns: string[] | string
  mode?: 'contains' | 'startsWith' | 'like'
}

export type QueryConfig = {
  select?: string[] | string
  where?: Record<string, unknown | QueryOperator>
  orderBy?: { column: string; ascending?: boolean } | string
  search?: string | QuerySearch
  limit?: number
  range?: [number, number]
}

export type HyperTillModelApi<Row extends Record<string, any> = Record<string, any>> = {
  table: string
  query(config?: QueryConfig): any
  fetch(config?: QueryConfig): Promise<ReactiveResponse<Row[]>>
  subscribe(config: QueryConfig, listener: (payload: ReactiveResponse<Row[]>) => void): () => void
  create(values: Row): Promise<ReactiveResponse<Row[]>>
  createMany(values: Row[]): Promise<ReactiveResponse<Row[]>>
  update(id: string, values: Partial<Row>): Promise<ReactiveResponse<Row[]>>
  patch(where: Record<string, unknown>, values: Partial<Row>): Promise<ReactiveResponse<Row[]>>
  remove(where: Record<string, unknown>): Promise<ReactiveResponse<Row[]>>
  delete(id: string): Promise<ReactiveResponse<Row[]>>
  upsert(values: Row | Row[], options?: ReactiveUpsertOptions): Promise<ReactiveResponse<Row[]>>
  useList(config?: QueryConfig, deps?: ReadonlyArray<any>): { data: Row[] | null; error: Error | null; isLoading: boolean }
  useById(id: string, deps?: ReadonlyArray<any>): { data: Row | null; error: Error | null; isLoading: boolean }
}

export type HyperTillClient = {
  reactive: ReactiveClient
  events: {
    emit(eventName: string, payload?: unknown): void
    on(eventName: string, handler: (payload: unknown) => void): () => void
    off(eventName: string, handler: (payload: unknown) => void): void
    clear(): void
  }
  models: ModelDefinition[]
  getModel(tableOrName: string): HyperTillModelApi
  [table: string]: any
}

export type CreateHyperTillOptions = {
  database: any
  models: ModelDefinition[]
  reactiveOptions?: { idGenerator?: () => string }
}

export declare function createHyperTill(options: CreateHyperTillOptions): HyperTillClient
