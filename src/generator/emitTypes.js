// @noflow

const mapTsType = (field: any): string => {
  switch (field.kind) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'json':
      return 'unknown'
    case 'relation':
      return 'string'
    default:
      return 'unknown'
  }
}

const toInterfaceName = (model: any): string => `${model.name}Row`

export const emitTypesFile = (models: any[]): string => {
  const blocks = models.map((model) => {
    const fields = model.fields
      .map((field) => {
        const optional = field.optional ? '?' : ''
        const tsType = mapTsType(field)
        const propName = field.name
        return `  ${propName}${optional}: ${tsType}`
      })
      .join('\n')

    return `export interface ${toInterfaceName(model)} {\n  id?: string\n${fields ? `${fields}\n` : ''}}`
  })

  const mapEntries = models
    .map((model) => `  ${model.table}: ${toInterfaceName(model)}`)
    .join('\n')

  return `${blocks.join('\n\n')}\n\nexport interface HyperTillRowMap {\n${mapEntries}\n}\n`
}
