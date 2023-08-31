#!/usr/bin/env node

const fs = require('fs')
const { spawnSync } = require('child_process')
const { dirname, join } = require('path')

const { minimatch } = require('minimatch')

const randomChars = () => {
  return Math.random().toString(36).slice(2)
}

const resolveFromModule = (moduleName, ...paths) => {
  const modulePath = dirname(require.resolve(`${moduleName}/package.json`))
  return join(modulePath, ...paths)
}

const resolveFromRoot = (...paths) => {
  return join(process.cwd(), ...paths)
}

const args = process.argv.slice(2)

const argsProjectIndex = args.findIndex(arg =>
  ['-p', '--project'].includes(arg),
)

const argsProjectValue =
  argsProjectIndex !== -1 ? args[argsProjectIndex + 1] : undefined

const argsLeaveIncludesUntouched =
  args.findIndex(arg => ['-i'].includes(arg)) !== -1

// Load existing config
const tsconfigPath = argsProjectValue || resolveFromRoot('tsconfig.json')
const tsconfigContent = fs.readFileSync(tsconfigPath).toString()
// Use 'eval' to read the JSON as regular JavaScript syntax so that comments are allowed
let tsconfig = {}
eval(`tsconfig = ${tsconfigContent}`)

const isExcluded = file =>
  (tsconfig?.exclude ?? []).some(pattern => minimatch(file, pattern))

const filesInArgs = args.filter(file => /\.(ts|tsx)$/.test(file))

const files = filesInArgs.filter(file => !isExcluded(file))

if (files.length === 0) {
  process.exit(0)
}

const remainingArgsToForward = args
  .slice()
  .filter(arg => !filesInArgs.includes(arg))

if (argsProjectIndex !== -1) {
  remainingArgsToForward.splice(argsProjectIndex, 2)
}

// Write a temp config file
const tmpTsconfigPath = resolveFromRoot(`tsconfig.${randomChars()}.json`)
const tmpTsconfig = {
  ...tsconfig,
  compilerOptions: {
    ...tsconfig.compilerOptions,
    skipLibCheck: true,
  },
  files,
  ...(argsLeaveIncludesUntouched ? {} : { includes: [] }),
}
fs.writeFileSync(tmpTsconfigPath, JSON.stringify(tmpTsconfig, null, 2))

// Attach cleanup handlers
let didCleanup = false
for (const eventName of ['exit', 'SIGHUP', 'SIGINT', 'SIGTERM']) {
  process.on(eventName, exitCode => {
    if (didCleanup) return
    didCleanup = true

    fs.unlinkSync(tmpTsconfigPath)

    if (eventName !== 'exit') {
      process.exit(exitCode)
    }
  })
}

// Type-check our files
const { status } = spawnSync(
  // See: https://github.com/gustavopch/tsc-files/issues/44#issuecomment-1250783206
  process.versions.pnp
    ? 'tsc'
    : resolveFromModule(
        'typescript',
        `../.bin/tsc${process.platform === 'win32' ? '.cmd' : ''}`,
      ),
  ['-p', tmpTsconfigPath, ...remainingArgsToForward],
  { stdio: 'inherit' },
)

process.exit(status)
