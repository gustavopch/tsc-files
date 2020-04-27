#!/usr/bin/env node
const { dirname, resolve } = require('path')
const { spawnSync } = require('child_process')
const fs = require('fs')
const yargsParser = require('yargs-parser')

const { randomChars, resolveFromModule, resolveFromRoot } = require('./utils')
const argvCleaned = process.argv.slice(2)
const args = yargsParser(argvCleaned)
const filesToCheck = args._.filter(file => /\.(ts|tsx)$/.test(file)) // but what about globs ?

// cleaning arguments to keep only arguments to pass to tsc
const indexOfProjectInArgs = argvCleaned.includes('-p') ? argvCleaned.indexOf('-p') : argvCleaned.indexOf('--project')
if (indexOfProjectInArgs !== -1) {
  argvCleaned.splice(indexOfProjectInArgs, 2)
}
const remainingArgsToPass = argvCleaned.filter(arg => !filesToCheck.includes(arg))

// Nothing to be type-checked?
if (filesToCheck.length === 0) {
  process.exit(0)
}

// Load existing config
const tsconfigPath = args.p || resolveFromRoot('tsconfig.json')
const tsconfigFolder = dirname(tsconfigPath);
let tsconfig = {};
const existingTsconfigContent = fs.readFileSync(tsconfigPath).toString();
// using eval to make comments in tsconfig.json still possible
eval(`tsconfig = \n${existingTsconfigContent}`);
// Write a temp config file
const tmpTsconfigPath = resolve(tsconfigFolder, `tsconfig.${randomChars()}.json`)
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
const { status } = spawnSync(
  resolveFromModule('typescript', `../.bin/tsc${process.platform === 'win32' ? '.cmd' : ''}`),
  ['-p', tmpTsconfigPath, ...remainingArgsToPass],
  { stdio: 'inherit' },
)

// Delete temp config file
fs.unlinkSync(tmpTsconfigPath)

process.exit(status);
