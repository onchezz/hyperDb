// @noflow

import { toPascalCase } from './utils'

const singular = (model: any): string => {
  if (model.table.endsWith('s') && model.table.length > 1) {
    return model.table.slice(0, -1)
  }
  return model.table
}

const relationHookNames = (model: any): string[] =>
  model.fields
    .filter((field) => field.kind === 'relation')
    .map((field) => {
      const suffix = toPascalCase(field.name)
      return `export const use${toPascalCase(model.table)}By${suffix} = (db, value, deps = [], config = {}) => db.${model.table}.useBy${suffix}(value, deps, config)`
    })

export const emitHooksFile = (models: any[]): string => {
  const lines = [
    `import * as React from 'react'`,
    '',
    `// Generated ergonomic wrappers around createHyperTill() model APIs.`,
    '',
  ]

  models.forEach((model) => {
    const modelPascal = toPascalCase(model.table)
    const entityPascal = toPascalCase(singular(model))
    const modelKey = model.table

    lines.push(
      `export const use${modelPascal} = (db, config = {}, deps = []) => db.${modelKey}.useList(config, deps)`,
      `export const use${entityPascal}ById = (db, id, deps = []) => db.${modelKey}.useById(id, deps)`,
      `export const useCreate${entityPascal} = (db) => React.useCallback((payload) => db.${modelKey}.create(payload), [db])`,
      `export const useUpdate${entityPascal} = (db) => React.useCallback((id, patch) => db.${modelKey}.update(id, patch), [db])`,
      `export const useDelete${entityPascal} = (db) => React.useCallback((id) => db.${modelKey}.delete(id), [db])`,
      ...relationHookNames(model),
      '',
    )
  })

  return `${lines.join('\n')}\n`
}
