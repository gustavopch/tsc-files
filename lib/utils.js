const { dirname, join, relative } = require('path')

const log = console.log;

const red = (text) => `\x1b[31m${text}\x1b[0m`;

const resolveFromModule = (moduleName, ...paths) => {
  const modulePath = dirname(require.resolve(`${moduleName}/package.json`))
  return join(modulePath, ...paths)
}

const resolveFromRoot = (...paths) => {
  return join(process.cwd(), ...paths)
}


const getChangedFilesErrors = (output, files) => {
  return files.reduce((acc, file) => {
    const filePath = relative(process.cwd(), file).split('\\').join('/');
    const inFileErrors = output.filter((tsError) => tsError.includes(filePath));

    if (inFileErrors.length) {
      acc.push(...inFileErrors);
    }

    return acc;
  }, []);
}

const displayErrors = (errors) => {
  if (errors.length) {
    const formattedErrors = errors.map((err) => `❌  ${red(err)}`).join('\r\n');

    console.error(formattedErrors);

    log(`💥  typescript errors found: ${errors.length} `);
    process.exit(1);
  }
} 

module.exports = {
  resolveFromModule,
  resolveFromRoot,
  getChangedFilesErrors,
  displayErrors
}
