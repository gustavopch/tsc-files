#!/usr/bin/env node

const { spawnSync } = require('child_process')
const fs = require('fs')

const { randomChars, resolveFromModule, resolveFromRoot } = require('./utils')

const args = process.argv.slice(2)
const argsProjectIndex = args.findIndex(arg => ['-p', '--project'].includes(arg)) // prettier-ignore
const argsProjectValue = argsProjectIndex !== -1 ? args[argsProjectIndex + 1] : undefined // prettier-ignore

const files = args.filter(file => /\.(ts|tsx)$/.test(file))
if (files.length === 0) {
  process.exit(0)
}

const remainingArgsToForward = args.slice().filter(arg => !files.includes(arg))

if (argsProjectIndex !== -1) {
  remainingArgsToForward.splice(argsProjectIndex, 2)
}

// Load existing config
const tsconfigPath = argsProjectValue || resolveFromRoot('tsconfig.json')
const tsconfigContent = fs.readFileSync(tsconfigPath).toString()
// Use 'eval' to read the JSON as regular JavaScript syntax so that comments are allowed
let tsconfig = {}
eval(`tsconfig = ${tsconfigContent}`)

// Write a temp config file
const tmpTsconfigPath = resolveFromRoot(`tsconfig.${randomChars()}.json`)
const tmpTsconfig = {
  ...tsconfig,
  compilerOptions: {
    ...tsconfig.compilerOptions,
    skipLibCheck: true,
  },
  files,
  include: [],
}
fs.writeFileSync(tmpTsconfigPath, JSON.stringify(tmpTsconfig, null, 2))

// Type-check our files
const { status } = spawnSync(
  resolveFromModule(
    'typescript',
    `../.bin/tsc${process.platform === 'win32' ? '.cmd' : ''}`,
  ),
  ['-p', tmpTsconfigPath, ...remainingArgsToForward],
  { stdio: 'inherit' },
)

// Delete temp config file
fs.unlinkSync(tmpTsconfigPath)

process.exit(status)
