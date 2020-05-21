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

module.exports = {
  randomChars,
  resolveFromModule,
  resolveFromRoot,
}
