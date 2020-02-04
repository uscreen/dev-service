'use strict'

const fs = require('fs-extra')
const path = require('path')
const readPkg = require('read-pkg')
const chalk = require('chalk')
const { spawn } = require('child_process')

const { root, COMPOSE_DIR } = require('../src/constants')

/**
 * Read package json
 */
module.exports.readPackageJson = async () => {
  const packageJson = await readPkg({ cwd: root }).catch(e => {
    throw Error('No package.json')
  })

  const services = packageJson.services || []
  const projectname = packageJson.name || path.basename(root)

  if (services.length === 0) {
    throw Error('No services defined')
  }

  return { packageJson, services, projectname }
}

/**
 * Checks if compose directory exists and contains files
 */
const checkComposeDir = () => {
  return fs.existsSync(COMPOSE_DIR) && fs.readdirSync(COMPOSE_DIR).length > 0
}

/**
 * Removes all content from compose directory
 */
module.exports.resetComposeDir = () => {
  fs.removeSync(COMPOSE_DIR)
  fs.ensureDirSync(COMPOSE_DIR)
}

/**
 * Show error message & exit
 */
module.exports.error = e => {
  console.error(chalk.red(`ERROR: ${e.message}`))
  process.exit(e.code || 1)
}

/**
 * spawns a child process and returns a promise
 */
const run = (command, parameters = [], cwd = null, stdio = [0, 1, 2]) =>
  new Promise((resolve, reject) => {
    const c = spawn(command, parameters, {
      cwd,
      stdio
    })
    c.on('close', code => {
      if (code === 0) return resolve(code)
      const e = Error(`Running "${command}" returns exit code ${code}`)
      e.code = code
      reject(e)
    })
  })
module.exports.run = run

/**
 * executes docker command
 */
module.exports.docker = async (...params) => {
  return run('docker', params, __dirname, [null, null, null])
}

/**
 * executes docker-compose command
 */
module.exports.compose = async (...params) => {
  if (!checkComposeDir()) {
    throw Error('No services found. Try running `service install`')
  }

  const files = fs.readdirSync(COMPOSE_DIR)

  const ps = []
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return run('docker-compose', ps, COMPOSE_DIR)
}
