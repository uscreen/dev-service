'use strict'

const fs = require('fs-extra')
const chalk = require('chalk')
const { spawn } = require('child_process')

const { SERVICES_DIR } = require('../src/constants')

/**
 * Ensures existence of a service directory
 */
const ensureServicesDir = () => {
  fs.ensureDirSync(SERVICES_DIR)
}
module.exports.ensureServicesDir = ensureServicesDir

/**
 * Removes all content from service directory
 */
module.exports.resetServiceDir = () => {
  fs.removeSync(SERVICES_DIR)
  fs.ensureDirSync(SERVICES_DIR)
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
const run = (command, parameters = [], cwd = null) =>
  new Promise((resolve, reject) => {
    const c = spawn(command, parameters, {
      cwd,
      stdio: [0, 1, 2]
    })
    c.on('close', code => {
      if (code === 0) return resolve(code)
      reject(code)
    })
  })
module.exports.run = run

/**
 * executes docker-compose command
 */
module.exports.compose = async (...params) => {
  ensureServicesDir(SERVICES_DIR)

  const files = fs.readdirSync(SERVICES_DIR)

  const ps = []
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return run('docker-compose', ps, SERVICES_DIR)
}
