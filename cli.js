#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const distCli = path.join(__dirname, 'dist', 'cli.js')

if (!fs.existsSync(distCli)) {
  console.error('[HyperTillDB] Missing dist/cli.js. Run `npm run build` first.')
  process.exit(1)
}

require(distCli)
