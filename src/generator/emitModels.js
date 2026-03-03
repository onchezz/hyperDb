// @noflow

const toClassName = (model: any): string => model.name

const associationLines = (model: any): string[] => {
  const belongsTo = model.fields
    .filter((field) => field.kind === 'relation')
    .map((field) => `    ${field.relationTable}: { type: 'belongs_to', key: '${field.columnName}' },`)

  if (!belongsTo.length) {
    return []
  }

  return ['  static associations = {', ...belongsTo, '  }']
}

export const emitModelFile = (model: any): string => {
  const rowsType = `${model.name}Row`
  const lines = [
    `import { Model } from '@onchez/hypertilldb'`,
    `import type { ${rowsType} } from '../types'`,
    '',
    `export class ${toClassName(model)} extends Model {`,
    `  static table = '${model.table}'`,
    ...associationLines(model),
    '',
    `  declare _raw: ${rowsType}`,
    '}',
    '',
    `export default ${toClassName(model)}`,
    '',
  ]

  return lines.join('\n')
}
