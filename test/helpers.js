'use strict'

import path from 'path'
import { fileURLToPath } from 'url'
import { readPackageSync } from 'read-pkg'
import { exec } from 'child_process'
import fs from 'fs-extra'
import http from 'http'
import YAML from 'yaml'

import { docker, escape } from '../src/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const arenaPath = path.resolve(__dirname, './_arena')
export const servicesPath = path.resolve(arenaPath, 'services')
export const composePath = path.resolve(arenaPath, 'services/.compose')

export const otherArenaPath = path.resolve(__dirname, './_otherarena')
const otherComposePath = path.resolve(otherArenaPath, 'services/.compose')

export { escape }

// for easy string testing: disable color output of chalk
process.env.FORCE_COLOR = 0

export const cli = (args, cwd, env, timeout) => {
  env = { ...process.env, ...env }

  return new Promise((resolve) => {
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

const _compose = (other = false) => async (...params) => {
  const ap = other ? otherArenaPath : arenaPath
  const cp = other ? otherComposePath : composePath

  const packageJson = readPackageSync({ cwd: ap })
  const name = packageJson.name || path.basename(ap)
  const projectname = escape(name)
  const files = fs.readdirSync(cp).filter((f) => f !== '.gitignore')

  const ps = []
  ps.push('-p', projectname)
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return new Promise((resolve) => {
    exec(
      `docker-compose ${ps.join(' ')}`,
      { cwd: cp },
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

const _prepareArena = (other = false) => (packageJson) => {
  const ap = other ? otherArenaPath : arenaPath

  fs.removeSync(ap)
  fs.mkdirSync(ap)

  if (!packageJson) {
    return
  }

  fs.writeFileSync(
    path.resolve(ap, 'package.json'),
    JSON.stringify(packageJson),
    {
      encoding: 'utf-8'
    }
  )
}

const _clearArena = (other = false) => async () => {
  const ap = other ? otherArenaPath : arenaPath
  const cp = other ? otherComposePath : composePath

  if (fs.existsSync(cp)) {
    await _compose(other)('stop').catch((e) => {})
    await _compose(other)('rm', '-fv').catch((e) => {})
  }

  fs.removeSync(ap)

  // Catch error if volume not exists:
  if (!other)
    await docker('volume', 'rm', 'dev-service-test-mongo-data').catch((e) => {})
}

export const compose = _compose(false)
export const prepareArena = _prepareArena(false)
export const clearArena = _clearArena(false)

export const prepareOtherArena = _prepareArena(true)
export const clearOtherArena = _clearArena(true)

export const loadYaml = (filepath) => {
  const content = fs.readFileSync(filepath, {
    encoding: 'utf-8'
  })
  const data = YAML.parse(content)

  return data
}

export const webserver = {
  start(port) {
    const server = http.createServer((req, res) => {
      res.end()
    })
    server.listen(port)

    return server
  },

  stop(server, callback) {
    server.close(callback)
  }
}
