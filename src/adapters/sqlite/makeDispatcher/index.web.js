// @flow

import { type ConnectionTag } from '../../../utils/common'
import { type ResultCallback } from '../../../utils/fp/Result'
import type {
  DispatcherType,
  SQLiteAdapterOptions,
  SqliteDispatcher,
  SqliteDispatcherMethod,
  SqliteDispatcherOptions,
} from '../type'

class SqliteWebDispatcher implements SqliteDispatcher {
  call(_methodName: SqliteDispatcherMethod, _args: any[], callback: ResultCallback<any>): void {
    callback({
      error: new Error(
        `[HyperTillDB] SQLiteAdapter is not available on web builds. Use '@onchez/hypertilldb/adapters/lokijs' or provide a web-safe adapter.`,
      ),
    })
  }
}

export const makeDispatcher = (
  _type: DispatcherType,
  _tag: ConnectionTag,
  _dbName: string,
  _options: SqliteDispatcherOptions,
): SqliteDispatcher => new SqliteWebDispatcher()

export function getDispatcherType(_options: SQLiteAdapterOptions): DispatcherType {
  return 'asynchronous'
}
