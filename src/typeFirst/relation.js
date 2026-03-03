// @noflow

import { relation as fieldRelation } from '../modeling/fields'
import { createRelationDescriptor } from './defineModels'

const normalizeForeignKeyArg = (value: mixed): void | string => {
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`[HyperTillDB] relation.*() foreignKey must be a non-empty string`)
  }
  return value
}

const relationBase = (table: string): any => fieldRelation(table)

relationBase.to = (targetName: string, foreignKey?: string) =>
  createRelationDescriptor(targetName, foreignKey)

const RESERVED_PROPERTIES = new Set([
  'length',
  'name',
  'prototype',
  'to',
  'apply',
  'call',
  'bind',
  'toString',
  'valueOf',
  'inspect',
])

export const relation = new Proxy(relationBase, {
  get(target, prop, receiver) {
    if (typeof prop !== 'string') {
      return Reflect.get(target, prop, receiver)
    }

    if (RESERVED_PROPERTIES.has(prop)) {
      return Reflect.get(target, prop, receiver)
    }

    return (foreignKey?: string) => createRelationDescriptor(prop, normalizeForeignKeyArg(foreignKey))
  },
})
