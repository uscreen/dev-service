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
          .filter((r) => r)
          .map((r) => r.split(/\s+/))
          .filter((r) => r[0].match(/^(udp|tcp)/))
          .filter((r) => r[5].match(/^(LISTEN|ESTABLISHED)$/))
          .find((r) => r[3].match(`\\.${port}$`))

        if (!process) return resolve(null)

        resolve(process[8])
      }
    )
  })

/**
 * Get pids for given ports
 */
const getPIDs = async (ports) => {
  const pids = {}

  for (const port of ports) {
    const pid = await getPID(port)
    if (pid) {
      pids[port] = pid
    }
  }

  return pids
}

/**
 * Get process details for given pid
 */
const getProcess = async (pid) =>
  new Promise((resolve, reject) => {
    exec(
      `ps -p ${pid} -ww -o pid,ppid,uid,gid,args`,
      function (err, stdout, stderr) {
        if (err || stderr.toString().trim()) {
          return reject(err)
        }

        const processes = stdout
          .toString()
          .split(/\n/)
          .slice(1) // skip headers
          .filter((r) => r)
          .map((r) => r.split(/\s+/))
          .map(([pid, ppid, uid, gid, ...args]) => ({
            pid,
            ppid,
            uid,
            gid,
            cmd: args.join(' ')
          }))

        if (!processes[0]) return resolve(null)

        resolve(processes[0])
      }
    )
  })

/**
 * Get process details for given pids
 */
const getProcesses = async (pids) => {
  const processes = {}

  for (const pid of pids) {
    const process = await getProcess(pid)
    if (process) {
      processes[pid] = process
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

  const ports = getPorts(service)
  const portsToPids = await getPIDs(ports)

  if (Object.keys(portsToPids).length === 0) return // everything ok

  const pids = [...new Set(Object.values(portsToPids))]
  const pidsToProcesses = await getProcesses(pids)

  throw Error(
    [
      'Required port(s) are already allocated:',
      ...Object.entries(portsToPids).map(
        ([port, pid]) =>
          `- port ${port} is used by process with pid ${pid}` +
          (pidsToProcesses[pid] && pidsToProcesses[pid].cmd
            ? ` (${pidsToProcesses[pid].cmd})`
            : '')
      )
    ].join('\n')
  )
}
