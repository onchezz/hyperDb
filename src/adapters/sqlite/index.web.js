// @flow

import type { SQLiteAdapterOptions } from './type'

export default class SQLiteAdapterWeb {
  constructor(_options: SQLiteAdapterOptions): void {
    throw new Error(
      `[HyperTillDB] SQLiteAdapter is not available on web. Use '@onchez/hypertilldb/adapters/lokijs' for web builds or provide a custom adapter.`,
    )
  }
}
