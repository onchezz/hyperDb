import { uuidv4 } from './index'

describe('ids', () => {
  it('generates RFC-compatible UUIDv4 strings', () => {
    const value = uuidv4()
    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('generates unique UUIDv4 values in a sample set', () => {
    const values = new Set()
    for (let i = 0; i < 100; i += 1) {
      values.add(uuidv4())
    }
    expect(values.size).toBe(100)
  })
})

