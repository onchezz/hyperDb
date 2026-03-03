import fs from 'fs'
import os from 'os'
import path from 'path'

import { generate } from './index'

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hypertill-gen-'))

const write = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

const modelsModule = (body) => `module.exports = [${body}]\n`

describe('generator', () => {
  it('generates deterministic files for additive model definitions', () => {
    const cwd = makeTempDir()
    write(
      path.join(cwd, 'hypertill/models.js'),
      modelsModule(`
      {
        table: 'books',
        name: 'Book',
        fields: [
          { name: 'title', columnName: 'title', kind: 'string', optional: false, indexed: false, hasDefault: false, defaultValue: undefined, relationTable: null }
        ]
      }
    `),
    )

    const result = generate({ cwd, modelsPath: 'hypertill/models.js' })

    expect(result.changedFiles.length).toBeGreaterThan(0)
    expect(fs.existsSync(path.join(cwd, 'hypertill/generated/schema.ts'))).toBe(true)
    expect(fs.existsSync(path.join(cwd, 'hypertill/generated/model-snapshot.json'))).toBe(true)
  })

  it('blocks destructive changes without explicit migration mapping', () => {
    const cwd = makeTempDir()

    write(
      path.join(cwd, 'hypertill/models.js'),
      modelsModule(`
      {
        table: 'books',
        name: 'Book',
        fields: [
          { name: 'title', columnName: 'title', kind: 'string', optional: false, indexed: false, hasDefault: false, defaultValue: undefined, relationTable: null }
        ]
      }
    `),
    )

    generate({ cwd, modelsPath: 'hypertill/models.js' })

    write(
      path.join(cwd, 'hypertill/models.js'),
      modelsModule(`
      {
        table: 'books',
        name: 'Book',
        fields: [
          { name: 'name', columnName: 'name', kind: 'string', optional: false, indexed: false, hasDefault: false, defaultValue: undefined, relationTable: null }
        ]
      }
    `),
    )

    expect(() => generate({ cwd, modelsPath: 'hypertill/models.js' })).toThrow(/Destructive schema changes detected/)
  })

  it('allows renamed columns when migration map is provided', () => {
    const cwd = makeTempDir()

    write(
      path.join(cwd, 'hypertill/models.js'),
      modelsModule(`
      {
        table: 'books',
        name: 'Book',
        fields: [
          { name: 'title', columnName: 'title', kind: 'string', optional: false, indexed: false, hasDefault: false, defaultValue: undefined, relationTable: null }
        ]
      }
    `),
    )

    generate({ cwd, modelsPath: 'hypertill/models.js' })

    write(
      path.join(cwd, 'hypertill/models.js'),
      modelsModule(`
      {
        table: 'books',
        name: 'Book',
        fields: [
          { name: 'name', columnName: 'name', kind: 'string', optional: false, indexed: false, hasDefault: false, defaultValue: undefined, relationTable: null }
        ]
      }
    `),
    )

    write(
      path.join(cwd, 'hypertill/hypertill.migration-map.js'),
      `module.exports = { renameColumns: { books: { title: 'name' } } }\n`,
    )

    expect(() =>
      generate({
        cwd,
        modelsPath: 'hypertill/models.js',
        migrationMapPath: 'hypertill/hypertill.migration-map.js',
      }),
    ).not.toThrow()
  })
})
