#!/usr/bin/env node

const { spawnSync } = require('child_process')
const fs = require('fs')
const { dirname, join } = require('path')

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

const getTsConfigForTypeScriptFile = (filePath) => {
  let currentDirectory = dirname(filePath)
  while (currentDirectory && currentDirectory !== '/' && currentDirectory !== '.') {
    const tsconfigPath = join(currentDirectory, 'tsconfig.json')
    if (fs.existsSync(tsconfigPath)) {
      return tsconfigPath
    }
    currentDirectory = dirname(currentDirectory)
  }

  return resolveFromRoot('tsconfig.json')
}

const args = process.argv.slice(2)

const argsProjectIndex = args.findIndex(arg =>
  ['-p', '--project'].includes(arg),
)

const argsProjectValue =
  argsProjectIndex !== -1 ? args[argsProjectIndex + 1] : undefined

const files = args.filter(file => /\.(ts|tsx)$/.test(file))
if (files.length === 0) {
  process.exit(0)
}

const remainingArgsToForward = args.slice().filter(arg => !files.includes(arg))

if (argsProjectIndex !== -1) {
  remainingArgsToForward.splice(argsProjectIndex, 2)
}

// Load existing config
const tsconfigPaths = argsProjectValue ? [argsProjectValue] : new Set(files.map(getTsConfigForTypeScriptFile))
for (const tsconfigPath of tsconfigPaths) {
  const cwd = dirname(tsconfigPath)
  const tsconfigContent = fs.readFileSync(tsconfigPath).toString()
  // Use 'eval' to read the JSON as regular JavaScript syntax so that comments are allowed
  let tsconfig = {}
  eval(`tsconfig = ${tsconfigContent}`)

  // Write a temp config file
  const tmpTsconfigPath = `tsconfig.${randomChars()}.json`
  const tmpTsconfig = {
    ...tsconfig,
    compilerOptions: {
      ...tsconfig.compilerOptions,
      skipLibCheck: true,
      noEmit: true,
      declaration: true
    },
    files: files.map(file => file.replace(cwd + '/', '')),
    include: [],
  }
  fs.writeFileSync(join(cwd, tmpTsconfigPath), JSON.stringify(tmpTsconfig, null, 2))

  // Attach cleanup handlers
  let didCleanup = false
  for (const eventName of ['exit', 'SIGHUP', 'SIGINT', 'SIGTERM']) {
    process.on(eventName, exitCode => {
      if (didCleanup) return
      didCleanup = true

      fs.unlinkSync(join(cwd, tmpTsconfigPath))

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
    ['--build', join(cwd, tmpTsconfigPath), ...remainingArgsToForward],
    { stdio: 'inherit' },
  )

  if(status) {
    process.exit(status)
  }
}