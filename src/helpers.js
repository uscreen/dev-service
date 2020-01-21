'use strict'

const fs = require('fs-extra')
const chalk = require('chalk')
const { spawn } = require('child_process')

const { SERVICES_DIR } = require('../src/constants')

/**
 * Ensures existence of a service directory
 */
module.exports.ensureServicesDir = () => {
  fs.ensureDirSync(SERVICES_DIR)
}

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
module.exports.run = (command, parameters = [], cwd = null) =>
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
