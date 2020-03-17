#!/usr/bin/env node

const { spawnSync } = require('child_process')
const fs = require('fs')
const yargsParser = require('yargs-parser')

const { randomChars, resolveFromModule, resolveFromRoot } = require('./utils')

const args = yargsParser(process.argv.slice(2))

const filesToCheck = args._.filter(file => /\.(ts|tsx)$/.test(file))

// Nothing to be type-checked?
if (filesToCheck.length === 0) {
  process.exit(0)
}

// Load existing config
const tsconfigPath = resolveFromRoot('tsconfig.json')
const tsconfig = require(tsconfigPath)

// Write a temp config file
const tmpTsconfigPath = resolveFromRoot(`tsconfig.${randomChars()}.json`)
const tmpTsconfig = {
  ...tsconfig,
  compilerOptions: {
    ...tsconfig.compilerOptions,
    skipLibCheck: true,
  },
  files: filesToCheck,
}
fs.writeFileSync(tmpTsconfigPath, JSON.stringify(tmpTsconfig, null, 2))

// Type-check our files
spawnSync(
  resolveFromModule('typescript', 'bin/tsc'),
  ['-p', tmpTsconfigPath, '--noEmit'],
  { stdio: 'inherit' },
)

// Delete temp config file
fs.unlinkSync(tmpTsconfigPath)
