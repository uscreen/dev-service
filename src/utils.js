'use strict'

const fs = require('fs-extra')
const path = require('path')
const readPkg = require('read-pkg')
const chalk = require('chalk')
const YAML = require('yaml')
const findProcess = require('find-process')
const { spawn } = require('child_process')

const { root, COMPOSE_DIR } = require('../src/constants')

/**
 * Read package json
 */
module.exports.readPackageJson = async () => {
  const packageJson = await readPkg({ cwd: root }).catch((e) => {
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
 * Get all compose files from compose directory
 */
const getComposeFiles = () =>
  fs.readdirSync(COMPOSE_DIR).filter((f) => f !== '.gitignore')

/**
 * Removes all content from compose directory
 */
module.exports.resetComposeDir = () => {
  fs.removeSync(COMPOSE_DIR)
  fs.ensureDirSync(COMPOSE_DIR)
  fs.writeFileSync(path.resolve(COMPOSE_DIR, '.gitignore'), '*', 'utf8')
}

/**
 * Show error message & exit
 */
module.exports.error = (e) => {
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
    c.on('close', (code) => {
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

  const files = getComposeFiles()

  const ps = []
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return run('docker-compose', ps, COMPOSE_DIR)
}

/**
 * executes docker-compose command
 */
module.exports.portsUsed = async (service) => {
  if (!checkComposeDir()) {
    throw Error('No services found. Try running `service install`')
  }

  const files = getComposeFiles()
  const ports = []
  const s = service
  for (const f of files) {
    if (s && `${s}.yml` !== f) continue

    const service = YAML.parse(
      fs.readFileSync(path.resolve(COMPOSE_DIR, f), 'utf8')
    )
    ports.push(
      Object.values(service.services)
        .map((v) => v.ports)
        .flat()
    )
  }

  const uniquePorts = [
    ...new Set(
      ports
        .flat(2)
        .map((p) => p.split(':'))
        .flat()
    )
  ]

  const usedPorts = []
  for (const port of uniquePorts) {
    const portUsed = await findProcess('port', port)
    if (portUsed.length > 0) {
      usedPorts.push(port)
      console.log(
        'Found %s process' +
          (portUsed.length === 1 ? '' : 'es') +
          ' blocking required port ' +
          port +
          '\n',
        portUsed.length
      )

      for (const item of portUsed) {
        console.log(chalk.cyan('[%s]'), item.name || 'unknown')
        console.log('pid: %s', chalk.white(item.pid))
        console.log('cmd: %s', chalk.white(item.cmd))
        console.log()
      }
    }
  }

  if (usedPorts.length > 0) {
    throw Error(`required port(s) ${usedPorts.join(
      ', '
    )} found already alocated.
      Please stop those processes prior to start services.
      TIP1: check for running docker containers by "docker ps -a".
      TIP2: stopping all brew services by "brew services stop --all".
    `)
  }

  return false
}
