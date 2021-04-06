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

export const compose = async (...params) => {
  const packageJson = readPackageSync({ cwd: arenaPath })
  const name = packageJson.name || path.basename(arenaPath)
  const projectname = escape(name)
  const files = fs.readdirSync(composePath).filter((f) => f !== '.gitignore')

  const ps = []
  ps.push('-p', projectname)
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return new Promise((resolve) => {
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

export const prepareArena = (packageJson) => {
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

export const clearArena = async () => {
  if (fs.existsSync(composePath)) {
    await compose('stop').catch((e) => {})
    await compose('rm', '-fv').catch((e) => {})
  }

  fs.removeSync(arenaPath)

  // Catch error if volume not exists:
  await docker('volume', 'rm', 'dev-service-test-mongo-data').catch((e) => {})
}

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
