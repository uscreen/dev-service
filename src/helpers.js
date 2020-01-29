'use strict'

const fs = require('fs-extra')
const chalk = require('chalk')
const { spawn } = require('child_process')

const { COMPOSE_DIR } = require('../src/constants')

/**
 * Ensures existence of a service directory
 */
const ensureServicesDir = () => {
  fs.ensureDirSync(COMPOSE_DIR)
}
module.exports.ensureServicesDir = ensureServicesDir

/**
 * Removes all content from service directory
 */
module.exports.resetServiceDir = () => {
  fs.removeSync(COMPOSE_DIR)
  fs.ensureDirSync(COMPOSE_DIR)
}

/**
 * Show error message
 */
module.exports.error = e => {
  console.error(chalk.red(`ERROR: ${e.message} Aborting.`))
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
      reject(code)
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
  ensureServicesDir(COMPOSE_DIR)

  const files = fs.readdirSync(COMPOSE_DIR)

  const ps = []
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return run('docker-compose', ps, COMPOSE_DIR)
}
