// @noflow

const mapFieldType = (field: any): string => {
  switch (field.kind) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'relation':
      return 'string'
    case 'json':
      return 'string'
    default:
      throw new Error(`[HyperTillDB] Unsupported field kind '${String(field.kind)}'`)
  }
}

const formatColumn = (field: any): string => {
  const attrs = [
    `name: '${field.columnName}'`,
    `type: '${mapFieldType(field)}'`,
  ]

  if (field.optional) {
    attrs.push('isOptional: true')
  }
  if (field.indexed) {
    attrs.push('isIndexed: true')
  }

  return `        { ${attrs.join(', ')} }`
}

export const emitSchemaFile = (models: any[], schemaVersion: number): string => {
  const tableBlocks = models.map((model) => {
    const columns = model.fields.map(formatColumn).join(',\n')
    return `    tableSchema({\n      name: '${model.table}',\n      columns: [\n${columns}\n      ],\n    })`
  })

  return `import { appSchema, tableSchema } from '@onchez/hypertilldb'\n\nexport const schema = appSchema({\n  version: ${schemaVersion},\n  tables: [\n${tableBlocks.join(',\n')}\n  ],\n})\n`
}
