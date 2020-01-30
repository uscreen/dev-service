'use strict'

const path = require('path')
const { exec } = require('child_process')
const fs = require('fs-extra')
const YAML = require('yaml')

const { docker } = require('../src/utils')

const arenaPath = path.resolve(__dirname, './_arena')
module.exports.arenaPath = arenaPath

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

  fs.writeFileSync(
    path.resolve(arenaPath, 'package.json'),
    JSON.stringify(packageJson),
    {
      encoding: 'utf-8'
    }
  )
}

module.exports.clearArena = async () => {
  fs.removeSync(arenaPath)
  fs.mkdirSync(arenaPath)

  // Catch error if volume not exists:
  await docker('volume', 'rm', 'dev-service-test-mongo-data').catch(e => {})
}

module.exports.loadYaml = filepath => {
  const content = fs.readFileSync(filepath, {
    encoding: 'utf-8'
  })
  const data = YAML.parse(content)

  return data
}
