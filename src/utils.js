'use strict'

const fs = require('fs-extra')
const path = require('path')
const readPkg = require('read-pkg')
const chalk = require('chalk')
const YAML = require('yaml')
const { exec, spawn } = require('child_process')

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
 * Get all ports used (by given service)
 */
const getPorts = (service) => {
  const files = getComposeFiles()
  const ports = []
  for (const f of files) {
    if (service && `${service}.yml` !== f) continue

    const yaml = YAML.parse(
      fs.readFileSync(path.resolve(COMPOSE_DIR, f), 'utf8')
    )
    ports.push(
      Object.values(yaml.services)
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

  return uniquePorts
}

/**
 * Find process listening to given port
 */
const getPID = (port) =>
  new Promise((resolve, reject) => {
    exec(
      'netstat -anv -p TCP && netstat -anv -p UDP',
      function (err, stdout, stderr) {
        if (err || stderr.toString().trim()) {
          return reject(err)
        }

        const process = stdout
          .toString()
          .split(/\n/)
          .map((r) => r.split(/\s+/))
          .filter((r) => r[0].match(/^(udp|tcp)/))
          .find((r) => r[3].match(`\\.${port}`))

        if (!process) return resolve(null)

        resolve(process[8])
      }
    )
  })

/**
 * Get processes for given ports
 */
const getPIDs = async (ports) => {
  const processes = {}

  for (const port of ports) {
    const pid = await getPID(port)
    if (pid) {
      processes[port] = pid
    }
  }

  return processes
}

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

  const { projectname } = await this.readPackageJson()
  const files = getComposeFiles()

  const ps = []
  ps.push('-p', projectname)
  for (const f of files) {
    ps.push('-f', f)
  }

  ps.push(...params)

  return run('docker-compose', ps, COMPOSE_DIR)
}

/**
 * check for processes using needed ports
 */
module.exports.checkUsedPorts = async (service) => {
  if (!checkComposeDir()) {
    throw Error('No services found. Try running `service install`')
  }

  const uniquePorts = getPorts(service)
  const pids = await getPIDs(uniquePorts)

  if (Object.keys(pids).length > 0) {
    throw Error(
      [
        'Required port(s) are already allocated:',
        ...Object.entries(pids).map(
          ([port, pid]) => `- port ${port} is used by process with pid ${pid}`
        )
      ].join('\n')
    )
  }
}
