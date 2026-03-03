import SQLiteAdapterWeb from './index.web'

describe('sqlite web adapter guard', () => {
  it('throws a clear error in web builds', () => {
    expect(() => {
      // $FlowFixMe
      new SQLiteAdapterWeb({})
    }).toThrow(/not available on web/)
  })
})
