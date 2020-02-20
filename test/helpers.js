'use strict'

const path = require('path')
const { exec } = require('child_process')
const fs = require('fs-extra')
const YAML = require('yaml')

const { docker } = require('../src/utils')

const arenaPath = path.resolve(__dirname, './_arena')
const servicesPath = path.resolve(arenaPath, 'services')
const composePath = path.resolve(arenaPath, 'services/.compose')

module.exports.arenaPath = arenaPath
module.exports.servicesPath = servicesPath
module.exports.composePath = composePath

// for easy string testing: disable color output of chalk
process.env.FORCE_COLOR = 0

module.exports.cli = (args, cwd, env, timeout) => {
  env = { ...process.env, ...env }

  return new Promise(resolve => {
    exec(
      `node ${path.resolve(__dirname, '../bin/cli.js')} ${args.join(' ')}`,
      { cwd, env, timeout },
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

module.exports.compose = (...params) => {
  const files = fs.readdirSync(composePath).filter(f => f !== '.gitignore')

  const ps = []
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return new Promise(resolve => {
    exec(
      `docker-compose ${ps.join(' ')}`,
      { cwd: composePath },
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
  fs.removeSync(arenaPath)
  fs.mkdirSync(arenaPath)

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
  if (fs.existsSync(composePath))
    await module.exports.compose('down').catch(e => {})

  fs.removeSync(arenaPath)

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
