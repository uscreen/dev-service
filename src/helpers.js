'use strict'

const { spawn } = require('child_process')

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
