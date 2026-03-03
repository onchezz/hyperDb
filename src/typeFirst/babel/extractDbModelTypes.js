// @noflow

const fs = require('fs')
const path = require('path')
const { parse } = require('@babel/parser')

const TYPE_PARSER_PLUGINS = ['typescript', 'jsx']
const FILE_CACHE = new Map()

const isTypeImportSpecifier = (importNode, specifier) => {
  if (importNode.importKind === 'type') {
    return true
  }
  return specifier.importKind === 'type'
}

const resolveImportFile = (fromFile, source) => {
  if (!source || !source.startsWith('.')) {
    return null
  }

  const base = path.resolve(path.dirname(fromFile), source)
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.d.ts`,
    `${base}.js`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.d.ts'),
    path.join(base, 'index.js'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

const collectTypeEnvironment = (filePath, programNode) => {
  const locals = new Map()
  const exportsMap = new Map()
  const imports = new Map()

  programNode.body.forEach((statement) => {
    if (statement.type === 'TSTypeAliasDeclaration' || statement.type === 'TSInterfaceDeclaration') {
      locals.set(statement.id.name, statement)
      return
    }

    if (statement.type === 'ExportNamedDeclaration') {
      const declaration = statement.declaration
      if (declaration) {
        if (declaration.type === 'TSTypeAliasDeclaration' || declaration.type === 'TSInterfaceDeclaration') {
          locals.set(declaration.id.name, declaration)
          exportsMap.set(declaration.id.name, declaration)
        }
      } else if (Array.isArray(statement.specifiers)) {
        statement.specifiers.forEach((specifier) => {
          if (specifier.type !== 'ExportSpecifier') {
            return
          }
          const localName = specifier.local && specifier.local.name
          const exportedName = specifier.exported && specifier.exported.name
          if (!localName || !exportedName) {
            return
          }
          if (locals.has(localName)) {
            exportsMap.set(exportedName, locals.get(localName))
          }
        })
      }
      return
    }

    if (statement.type === 'ImportDeclaration') {
      const importSource = statement.source && statement.source.value
      if (!importSource) {
        return
      }

      statement.specifiers.forEach((specifier) => {
        if (specifier.type !== 'ImportSpecifier') {
          return
        }
        if (!isTypeImportSpecifier(statement, specifier)) {
          return
        }
        const localName = specifier.local && specifier.local.name
        const importedName = specifier.imported && specifier.imported.name
        if (!localName || !importedName) {
          return
        }
        imports.set(localName, {
          source: String(importSource),
          importedName,
        })
      })
    }
  })

  return {
    filePath,
    locals,
    exportsMap,
    imports,
  }
}

const parseTypeFile = (filePath) => {
  if (FILE_CACHE.has(filePath)) {
    return FILE_CACHE.get(filePath)
  }

  const source = fs.readFileSync(filePath, 'utf8')
  const parsed = parse(source, {
    sourceFilename: filePath,
    sourceType: 'module',
    plugins: TYPE_PARSER_PLUGINS,
  })

  if (!parsed || !parsed.program) {
    throw new Error(`[HyperTillDB] Failed to parse type file '${filePath}'`)
  }

  const env = collectTypeEnvironment(filePath, parsed.program)
  FILE_CACHE.set(filePath, env)
  return env
}

const resolveTypeDeclaration = (env, typeName, seen = new Set()) => {
  const key = `${env.filePath}:${typeName}`
  if (seen.has(key)) {
    return null
  }
  seen.add(key)

  if (env.locals.has(typeName)) {
    return { env, declaration: env.locals.get(typeName) }
  }
  if (env.exportsMap.has(typeName)) {
    return { env, declaration: env.exportsMap.get(typeName) }
  }

  const imported = env.imports.get(typeName)
  if (!imported) {
    return null
  }

  const importFile = resolveImportFile(env.filePath, imported.source)
  if (!importFile) {
    return null
  }

  const importedEnv = parseTypeFile(importFile)
  if (importedEnv.exportsMap.has(imported.importedName)) {
    return {
      env: importedEnv,
      declaration: importedEnv.exportsMap.get(imported.importedName),
    }
  }
  if (importedEnv.locals.has(imported.importedName)) {
    return {
      env: importedEnv,
      declaration: importedEnv.locals.get(imported.importedName),
    }
  }
  return null
}

const isNullableNode = (node) =>
  node && (node.type === 'TSNullKeyword' || node.type === 'TSUndefinedKeyword')

const hasAnyOrUnknown = (node) => {
  if (!node || typeof node !== 'object') {
    return false
  }
  if (node.type === 'TSAnyKeyword' || node.type === 'TSUnknownKeyword') {
    return true
  }
  return Object.keys(node).some((key) => {
    const value = node[key]
    if (Array.isArray(value)) {
      return value.some((item) => hasAnyOrUnknown(item))
    }
    return hasAnyOrUnknown(value)
  })
}

const inferKindFromTypeNode = (node, env, seenTypeNames) => {
  if (!node) {
    return { kind: 'json', optionalFromType: false }
  }

  switch (node.type) {
    case 'TSStringKeyword':
      return { kind: 'string', optionalFromType: false }
    case 'TSNumberKeyword':
      return { kind: 'number', optionalFromType: false }
    case 'TSBooleanKeyword':
      return { kind: 'boolean', optionalFromType: false }
    case 'TSArrayType':
    case 'TSTupleType':
    case 'TSTypeLiteral':
      return { kind: 'json', optionalFromType: false }
    case 'TSLiteralType':
      if (node.literal && node.literal.type === 'StringLiteral') {
        return { kind: 'string', optionalFromType: false }
      }
      if (node.literal && node.literal.type === 'NumericLiteral') {
        return { kind: 'number', optionalFromType: false }
      }
      if (node.literal && node.literal.type === 'BooleanLiteral') {
        return { kind: 'boolean', optionalFromType: false }
      }
      return { kind: 'json', optionalFromType: false }
    case 'TSParenthesizedType':
      return inferKindFromTypeNode(node.typeAnnotation, env, seenTypeNames)
    case 'TSUnionType': {
      const variants = node.types || []
      const optionalFromType = variants.some(isNullableNode)
      const nonNullable = variants.filter((item) => !isNullableNode(item))
      if (!nonNullable.length) {
        return { kind: 'json', optionalFromType: true }
      }
      const inferred = nonNullable.map((item) => inferKindFromTypeNode(item, env, seenTypeNames).kind)
      const first = inferred[0]
      const same = inferred.every((kind) => kind === first)
      return {
        kind: same ? first : 'json',
        optionalFromType,
      }
    }
    case 'TSTypeReference': {
      const typeNameNode = node.typeName
      if (!typeNameNode || typeNameNode.type !== 'Identifier') {
        return { kind: 'json', optionalFromType: false }
      }
      const typeName = typeNameNode.name

      if (typeName === 'Date') {
        return { kind: 'number', optionalFromType: false }
      }
      if (typeName === 'Array' || typeName === 'ReadonlyArray' || typeName === 'Record') {
        return { kind: 'json', optionalFromType: false }
      }

      if (seenTypeNames.has(typeName)) {
        return { kind: 'json', optionalFromType: false }
      }
      seenTypeNames.add(typeName)
      const resolved = resolveTypeDeclaration(env, typeName)
      if (!resolved) {
        return { kind: 'json', optionalFromType: false }
      }

      if (resolved.declaration.type === 'TSInterfaceDeclaration') {
        return { kind: 'json', optionalFromType: false }
      }

      if (resolved.declaration.type === 'TSTypeAliasDeclaration') {
        return inferKindFromTypeNode(resolved.declaration.typeAnnotation, resolved.env, seenTypeNames)
      }

      return { kind: 'json', optionalFromType: false }
    }
    default:
      return { kind: 'json', optionalFromType: false }
  }
}

const getPropertyName = (propertyNode) => {
  if (!propertyNode.key) {
    return null
  }
  if (propertyNode.key.type === 'Identifier') {
    return propertyNode.key.name
  }
  if (propertyNode.key.type === 'StringLiteral') {
    return propertyNode.key.value
  }
  return null
}

const extractFieldEntriesFromMembers = (members, env) =>
  members
    .filter((member) => member.type === 'TSPropertySignature')
    .map((property) => {
      const name = getPropertyName(property)
      if (!name) {
        return null
      }

      const annotation = property.typeAnnotation && property.typeAnnotation.typeAnnotation
      if (!annotation) {
        return null
      }

      if (hasAnyOrUnknown(annotation)) {
        throw new Error(
          `[HyperTillDB] Unsupported '${name}' type: 'any' and 'unknown' are not allowed in dbModel<T>()`,
        )
      }

      const inferred = inferKindFromTypeNode(annotation, env, new Set())
      return [
        name,
        {
          kind: inferred.kind,
          optional: property.optional === true || inferred.optionalFromType === true,
        },
      ]
    })
    .filter(Boolean)

const extractTypeFields = (declaration, env) => {
  if (declaration.type === 'TSInterfaceDeclaration') {
    return Object.fromEntries(extractFieldEntriesFromMembers(declaration.body.body || [], env))
  }

  if (declaration.type === 'TSTypeAliasDeclaration') {
    const alias = declaration.typeAnnotation
    if (alias.type === 'TSTypeLiteral') {
      return Object.fromEntries(extractFieldEntriesFromMembers(alias.members || [], env))
    }
    if (alias.type === 'TSIntersectionType') {
      const allFields = alias.types
        .map((typeNode) => {
          if (typeNode.type !== 'TSTypeLiteral') {
            return []
          }
          return extractFieldEntriesFromMembers(typeNode.members || [], env)
        })
        .flat()
      return Object.fromEntries(allFields)
    }
    if (alias.type === 'TSTypeReference' && alias.typeName && alias.typeName.type === 'Identifier') {
      const resolved = resolveTypeDeclaration(env, alias.typeName.name)
      if (!resolved) {
        return {}
      }
      return extractTypeFields(resolved.declaration, resolved.env)
    }
  }

  return {}
}

const hasTypeMetaArgument = (args) =>
  args.some((arg) => {
    if (!arg || arg.type !== 'ObjectExpression') {
      return false
    }
    return arg.properties.some(
      (property) =>
        property.type === 'ObjectProperty' &&
        property.key &&
        property.key.type === 'Identifier' &&
        property.key.name === '__typeMeta',
    )
  })

module.exports = function hyperTillExtractDbModelTypesPlugin(api) {
  api.assertVersion(7)
  const t = api.types

  return {
    name: 'hypertill-extract-dbmodel-types',
    visitor: {
      Program(programPath, state) {
        const filename = state && state.filename ? state.filename : null
        if (!filename || !fs.existsSync(filename)) {
          return
        }
        const env = collectTypeEnvironment(filename, programPath.node)
        FILE_CACHE.set(filename, env)
      },
      CallExpression(pathNode, state) {
        const call = pathNode.node
        if (!call.callee || call.callee.type !== 'Identifier' || call.callee.name !== 'dbModel') {
          return
        }

        if (!call.typeParameters || !call.typeParameters.params || call.typeParameters.params.length === 0) {
          return
        }

        if (hasTypeMetaArgument(call.arguments || [])) {
          return
        }

        const typeParam = call.typeParameters.params[0]
        if (!typeParam || typeParam.type !== 'TSTypeReference' || !typeParam.typeName) {
          return
        }
        if (typeParam.typeName.type !== 'Identifier') {
          return
        }

        const filename = state && state.filename ? state.filename : null
        if (!filename) {
          return
        }

        const env = FILE_CACHE.get(filename) || parseTypeFile(filename)
        const typeName = typeParam.typeName.name
        const resolved = resolveTypeDeclaration(env, typeName)
        if (!resolved) {
          return
        }

        const fields = extractTypeFields(resolved.declaration, resolved.env)
        const fieldNames = Object.keys(fields).sort((a, b) => a.localeCompare(b))
        if (!fieldNames.length) {
          return
        }

        const fieldProperties = fieldNames.map((fieldName) =>
          t.objectProperty(
            t.identifier(fieldName),
            t.objectExpression([
              t.objectProperty(t.identifier('kind'), t.stringLiteral(fields[fieldName].kind)),
              t.objectProperty(t.identifier('optional'), t.booleanLiteral(fields[fieldName].optional === true)),
            ]),
          ),
        )

        const metaArgument = t.objectExpression([
          t.objectProperty(
            t.identifier('__typeMeta'),
            t.objectExpression([t.objectProperty(t.identifier('fields'), t.objectExpression(fieldProperties))]),
          ),
        ])

        call.arguments.push(metaArgument)
      },
    },
  }
}
