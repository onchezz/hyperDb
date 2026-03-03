import { defineModel, normalizeModels, string, number, relation } from './index'

describe('modeling', () => {
  it('creates deterministic model definitions and relation columns', () => {
    const model = defineModel('books', {
      title: string(),
      releaseYear: number().optional(),
    })

    expect(model.table).toBe('books')
    expect(model.fields.map((field) => field.columnName)).toEqual(['release_year', 'title'])
  })

  it('normalizes relation fields and validates relation target', () => {
    const authors = defineModel('authors', {
      name: string(),
    })

    const books = defineModel('books', {
      authorId: relation('authors'),
      title: string(),
    })

    const normalized = normalizeModels([books, authors])
    const booksModel = normalized.find((model) => model.table === 'books')
    expect(booksModel.fields.find((field) => field.name === 'authorId').columnName).toBe('author_id')
  })

  it('fails for missing relation target model', () => {
    const books = defineModel('books', {
      authorId: relation('authors'),
      title: string(),
    })

    expect(() => normalizeModels([books])).toThrow(/targets missing table/)
  })
})
