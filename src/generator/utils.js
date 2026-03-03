// @noflow

import fs from 'fs'
import path from 'path'
import vm from 'vm'

const tsPath = (() => {
  try {
    return require.resolve('typescript')
  } catch (_error) {
    return null
  }
})()

export const ensureDir = (dirPath: string): void => {
  fs.mkdirSync(dirPath, { recursive: true })
}

export const writeIfChanged = (filePath: string, content: string): boolean => {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
  if (existing === content) {
    return false
  }
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content)
  return true
}

const isPlainObject = (value: mixed): boolean =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export const stableStringify = (value: mixed): string => {
  if (value === null || value === undefined) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  if (isPlainObject(value)) {
    // $FlowFixMe[incompatible-type]
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    return `{${entries.join(',')}}`
  }

  return JSON.stringify(value)
}

export const toPascalCase = (value: string): string =>
  value
    .replace(/[-_\s]+(.)?/g, (_m, g) => (g ? g.toUpperCase() : ''))
    .replace(/^(.)/, (g) => g.toUpperCase())

export const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

export const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()

const createRequireForFile = (filePath: string) => {
  const { createRequire } = require('module')
  return createRequire(filePath)
}

const executeCommonJsModule = (source: string, filePath: string): any => {
  const sandboxModule = { exports: {} }
  const sandboxRequire = createRequireForFile(filePath)
  const sandbox = {
    module: sandboxModule,
    exports: sandboxModule.exports,
    require: sandboxRequire,
    __filename: filePath,
    __dirname: path.dirname(filePath),
    process,
    console,
  }

  vm.runInNewContext(source, sandbox, {
    filename: filePath,
    displayErrors: true,
  })

  return sandboxModule.exports
}

const loadTsModule = (filePath: string): any => {
  if (!tsPath) {
    throw new Error(
      `[HyperTillDB] Unable to load TypeScript file '${filePath}'. Install 'typescript' as a runtime dependency.`,
    )
  }

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const ts = require(tsPath)
  const source = fs.readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    fileName: filePath,
  })

  return executeCommonJsModule(transpiled.outputText, filePath)
}

export const loadModule = (filePath: string): any => {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.ts' || ext === '.tsx') {
    return loadTsModule(filePath)
  }
  const source = fs.readFileSync(filePath, 'utf8')
  return executeCommonJsModule(source, filePath)
}

export const resolveExport = (moduleExports: any): any => {
  if (moduleExports && moduleExports.default !== undefined) {
    return moduleExports.default
  }
  return moduleExports
}

export const readJsonFile = (filePath: string): any => {
  if (!fs.existsSync(filePath)) {
    return null
  }
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

export const timestampId = (): string => {
  const now = new Date()
  const pad = (value: number): string => `${value}`.padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export const relPath = (fromDir: string, toFile: string): string => {
  const relative = path.relative(fromDir, toFile)
  return relative.startsWith('.') ? relative : `./${relative}`
}
