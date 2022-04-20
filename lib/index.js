#!/usr/bin/env node

const { spawnSync } = require('child_process')
const fs = require('fs')
const jsoncParser = require('jsonc-simple-parser')

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
const tsconfig = jsoncParser.parse(tsconfigContent)

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

/*
  The process might be terminated before the temporary config cleanup is done.
  To prevent that we'll install exit listeners on termination signals to ensure
  that the file is cleaned up properly.
*/
let didCleanup = false
const exitCallback = function (
  signal,
  /*
    As documented in https://nodejs.org/api/process.html#signal-events, setting
    up listeners for *some* signals makes Node.js disable automatic process exit
    when they are emitted, thus shouldExit is necessary
  */
  shouldExit
) {
  return function (exitCode) {
    if (didCleanup) {
      return
    }
    didCleanup = true
    try {
      fs.unlinkSync(tmpTsconfigPath)
    } catch (error) {
      console.error(`Failed to clean up file during signal ${signal}`, error)
    }
    if (shouldExit) {
      process.exit(exitCode)
    }
  }
}

// Handle termination events from https://nodejs.org/api/process.html#signal-events
for (const signal of [
  'exit',
  'SIGINT',
  'SIGTERM',
  'SIGQUIT',
  'SIGHUP',
  'SIGPIPE',
]) {
  process.on(
    signal,
    exitCallback(
      signal,
      /*
        The "exit" signal is emitted when Node.js is exiting normally, thus
        (shouldExit = true) is not necessary in that case
      */
      signal === 'exit' ? false : true
    )
  )
}

// Type-check our files
const { status } = spawnSync(
  resolveFromModule(
    'typescript',
    `../.bin/tsc${process.platform === 'win32' ? '.cmd' : ''}`,
  ),
  ['-p', tmpTsconfigPath, ...remainingArgsToForward],
  { stdio: 'inherit' },
)

/*
  There's no need to clean up the temporary configuration file manually because
  that will be done automatically when the process is terminating
*/
process.exit(status)
