#!/usr/bin/env node

/* eslint-disable no-console */

const path = require('path')

const parseArgs = (argv) => {
  const hasHelpFlag = argv.includes('--help') || argv.includes('-h')
  if (hasHelpFlag) {
    return {
      command: 'help',
      cwd: process.cwd(),
    }
  }

  const inferredCommand = argv[2] && !argv[2].startsWith('--') ? argv[2] : 'generate'
  const startIndex = inferredCommand === 'generate' && argv[2] && argv[2].startsWith('--') ? 2 : 3
  const args = {
    command: inferredCommand,
    cwd: process.cwd(),
    modelsPath: undefined,
    outDir: undefined,
    migrationMapPath: undefined,
    snapshotPath: undefined,
    migrationsDir: undefined,
  }

  for (let i = startIndex; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--cwd') {
      args.cwd = path.resolve(argv[i + 1])
      i += 1
    } else if (token === '--models') {
      args.modelsPath = argv[i + 1]
      i += 1
    } else if (token === '--out') {
      args.outDir = argv[i + 1]
      i += 1
    } else if (token === '--migration-map') {
      args.migrationMapPath = argv[i + 1]
      i += 1
    } else if (token === '--snapshot') {
      args.snapshotPath = argv[i + 1]
      i += 1
    } else if (token === '--migrations-dir') {
      args.migrationsDir = argv[i + 1]
      i += 1
    }
  }

  return args
}

const printUsage = () => {
  console.log(`HyperTillDB CLI\n\nUsage:\n  hypertill generate [--cwd <dir>] [--models <path>] [--out <path>] [--migration-map <path>] [--snapshot <path>] [--migrations-dir <path>]`)
}

const main = () => {
  const { generate } = require('./generator')
  const args = parseArgs(process.argv)

  if (args.command === '--help' || args.command === '-h' || args.command === 'help') {
    printUsage()
    return
  }

  if (args.command !== 'generate') {
    printUsage()
    throw new Error(`[HyperTillDB] Unknown command '${args.command}'`)
  }

  const result = generate({
    cwd: args.cwd,
    modelsPath: args.modelsPath,
    outDir: args.outDir,
    migrationMapPath: args.migrationMapPath,
    snapshotPath: args.snapshotPath,
    migrationsDir: args.migrationsDir,
    logger: (message) => console.log(message),
  })

  if (!result.changedFiles.length) {
    console.log('[HyperTillDB] No changes to generate')
    return
  }

  console.log(`[HyperTillDB] schemaVersion=${result.schemaVersion}`)
  result.changedFiles.forEach((file) => console.log(`- ${file}`))
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
