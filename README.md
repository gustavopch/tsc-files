# tsc-files

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/gustavopch/tsc-files/Release?style=flat-square)

A tiny tool to run `tsc` on specific files without ignoring `tsconfig.json`.

## Installation

```sh
npm i -D tsc-files
```

```sh
yarn add -D tsc-files
```

## Why

I wanted to type-check **only the staged files** with [lint-staged](https://github.com/okonet/lint-staged).

Unfortunately passing specific files like `tsc --noEmit file1.ts file2.ts` will cause TypeScript to simply ignore your `tsconfig.json`.

There's already an open issue in the TypeScript repo to support this use case — you may want to give a 👍 there: https://github.com/microsoft/TypeScript/issues/27379

## Usage

With lint-staged:

```json
{
  "lint-staged": {
    "**/*.ts": "tsc-files --noEmit"
  }
}
```

## How it works

For the most part, it just forwards all arguments to `tsc` with one exception: the specified files will not be forwarded — instead, they will be put at the `files` property of a temporary config that will be generated next to your original `tsconfig.json`. Other than that, just read `tsc --help`.

## License

Released under the [MIT License](./LICENSE.md).
