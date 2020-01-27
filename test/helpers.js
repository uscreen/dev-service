'use strict'

const path = require('path')
const { exec } = require('child_process')
const fs = require('fs-extra')

const arenaPath = path.resolve(__dirname, './_arena')
module.exports.arenaPath = arenaPath

const arenaPkgPath = path.resolve(arenaPath, 'package.json')

// for easy string testing: disable color output of chalk
process.env.FORCE_COLOR = 0

module.exports.cli = (args, cwd) => {
  return new Promise(resolve => {
    exec(
      `node ${path.resolve(__dirname, '../bin/cli.js')} ${args.join(' ')}`,
      { cwd },
      (error, stdout, stderr) => {
        resolve({
          code: error && error.code ? error.code : 0,
          error,
          stdout,
          stderr
        })
      }
    )
  })
}

module.exports.prepareArena = packageJson => {
  if (!packageJson) {
    return
  }

  fs.writeFileSync(arenaPkgPath, JSON.stringify(packageJson), {
    encoding: 'utf-8'
  })
}

module.exports.clearArena = () => {
  fs.removeSync(arenaPath)
  fs.mkdirSync(arenaPath)
}
