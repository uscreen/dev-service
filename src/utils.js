'use strict'

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { readPackageSync } from 'read-pkg'
import chalk from 'chalk'
import { exec, spawn } from 'child_process'

import { root, COMPOSE_DIR } from './constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Read package json
 */
export const readPackageJson = () => {
  let packageJson = null
  try {
    packageJson = readPackageSync({ cwd: root })
  } catch (e) {}

  if (!packageJson) throw Error('Missing or invalid package.json')

  const services = packageJson.services || []
  const name = packageJson.name || path.basename(root)

  if (services.length === 0) {
    throw Error('No services defined')
  }

  return { packageJson, services, name }
}

/**
 * Escape string for use in docker
 */
export const escape = (name) =>
  name.replace(/^[^a-zA-Z0-9]*/, '').replace(/[^a-zA-Z0-9.-]/g, '-')

/**
 * Checks if compose directory exists and contains files
 */
export const checkComposeDir = () => {
  return fs.existsSync(COMPOSE_DIR) && fs.readdirSync(COMPOSE_DIR).length > 0
}

/**
 * Get all compose files from compose directory
 */
export const getComposeFiles = () =>
  fs.readdirSync(COMPOSE_DIR).filter((f) => f !== '.gitignore')

/**
 * read path to compose file/folder via `docker inspect <containerId>`
 */
const getComposePath = (containerId) =>
  new Promise((resolve, reject) => {
    exec(`docker inspect ${containerId}`, function (err, stdout, stderr) {
      if (err || stderr.toString().trim()) {
        return reject(err)
      }

      const [data] = JSON.parse(stdout)

      const result =
        data &&
        data.Config &&
        data.Config.Labels &&
        data.Config.Labels['com.docker.compose.project.working_dir']

      resolve(result || null)
    })
  })

/**
 * Get paths to compose files/folders from running containers
 */
export const getComposePaths = () =>
  new Promise((resolve, reject) => {
    exec('docker ps -q', function (err, stdout, stderr) {
      if (err || stderr.toString().trim()) {
        return reject(err)
      }

      const containers = stdout.split(/\n/).filter((r) => r)

      Promise.all(containers.map(getComposePath))
        .then((ps) => {
          const paths = Array.from(new Set(ps)).filter((p) => p)

          resolve(paths)
        })
        .catch((err) => {
          reject(err)
        })
    })
  })

/**
 * Removes all content from compose directory
 */
export const resetComposeDir = () => {
  fs.removeSync(COMPOSE_DIR)
  fs.ensureDirSync(COMPOSE_DIR)
  fs.writeFileSync(path.resolve(COMPOSE_DIR, '.gitignore'), '*', 'utf8')
}

/**
 * Show error message & exit
 */
export const error = (e) => {
  console.error(chalk.red(`ERROR: ${e.message}\n`))
  process.exit(e.code || 1)
}

/**
 * Show warn message
 */
export const warning = (message) => {
  console.error(chalk.yellow(`WARNING: ${message}\n`))
}

/**
 * spawns a child process and returns a promise
 */
export const run = (command, parameters = [], cwd = null, stdio = [0, 1, 2]) =>
  new Promise((resolve, reject) => {
    const c = spawn(command, parameters, {
      cwd,
      stdio
    })
    c.on('close', (code) => {
      if (code === 0) return resolve(code)
      const e = Error(`Running "${command}" returns exit code ${code}`)
      e.code = code
      reject(e)
    })
  })

/**
 * executes docker command
 */
export const docker = async (...params) => {
  return run('docker', params, __dirname, [null, null, null])
}

/**
 * executes docker-compose command
 */
export const compose = async (...params) => {
  if (!checkComposeDir()) {
    throw Error('No services found. Try running `service install`')
  }

  const { name } = await readPackageJson()
  const projectname = escape(name)
  const files = getComposeFiles()

  const ps = []
  ps.push('-p', projectname)
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return run('docker-compose', ps, COMPOSE_DIR)
}
