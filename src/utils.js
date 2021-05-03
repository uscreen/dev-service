'use strict'

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { readPackageSync } from 'read-pkg'
import chalk from 'chalk'
import YAML from 'yaml'
import { exec, spawn } from 'child_process'

import { root, COMPOSE_DIR } from '../src/constants.js'

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

  if (!packageJson) throw Error('No package.json')

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
const checkComposeDir = () => {
  return fs.existsSync(COMPOSE_DIR) && fs.readdirSync(COMPOSE_DIR).length > 0
}

/**
 * Get all compose files from compose directory
 */
const getComposeFiles = () =>
  fs.readdirSync(COMPOSE_DIR).filter((f) => f !== '.gitignore')

/**
 * Get own ports
 */
const getContainerPorts = (containerId) =>
  new Promise((resolve, reject) => {
    exec(`docker port ${containerId}`, function (err, stdout, stderr) {
      if (err || stderr.toString().trim()) {
        return reject(err)
      }

      const lines = stdout.split('\n').filter((l) => l)
      const ports = lines
        .map((l) => l.match(/.*:(\d+)/))
        .map((m) => (m.length >= 1 ? m[1] : null))
        .filter((p) => p)

      resolve(ports)
    })
  })

const getOwnPorts = () =>
  new Promise((resolve, reject) => {
    const { name } = readPackageJson()
    const projectname = escape(name)
    const files = getComposeFiles()

    const ps = []
    ps.push('-p', projectname)
    for (const f of files) {
      ps.push('-f', path.resolve(COMPOSE_DIR, f))
    }

    ps.push('ps', '-q')

    exec(`docker-compose ${ps.join(' ')}`, function (err, stdout, stderr) {
      if (err || stderr.toString().trim()) {
        return reject(err)
      }

      const ids = stdout.split('\n').filter((id) => id)

      Promise.all(ids.map(getContainerPorts)).then((ps) => {
        const ports = [].concat(...ps)
        resolve(ports)
      })
    })
  })

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
const getComposePaths = () =>
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
 * Get paths to other running dev-service instances
 */
export const checkOtherServices = async () => {
  const paths = (await getComposePaths())
    .filter((p) => p !== COMPOSE_DIR)
    .filter((p) => p.endsWith('/services/.compose'))
    .map((p) => p.replace(/\/services\/.compose$/, ''))

  if (paths.length > 0) {
    warning(
      [
        'dev-service is already running, started in following folder(s):',
        ...paths.map((p) => `  ${p}`)
      ].join('\n')
    )
  }
}

/**
 * Find process listening to given port
 */
const getPID = (port) =>
  new Promise((resolve, reject) => {
    exec(`lsof -nP -i:${port}`, function (_, stdout, stderr) {
      // `lsof` already returns a non-zero exit code if it did not find any running
      // process for the given port. Therefore we refrain from rejecting this Promise
      // if an error was handed over.

      const process = stdout
        .toString()
        .split(/\n/)
        .filter((r) => r)
        .map((r) => r.split(/\s+/))
        .find((r) => (r[9] || '').match(/(LISTEN)/))

      if (!process) return resolve(null)

      resolve(process[1])
    })
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

/**
 * check for processes using needed ports
 */
export const checkUsedPorts = async (service) => {
  if (!checkComposeDir()) {
    throw Error('No services found. Try running `service install`')
  }

  const ports = getPorts(service)
  const ownPorts = await getOwnPorts()
  const otherPorts = ports.filter((p) => !ownPorts.includes(p))

  const portsToPids = await getPIDs(otherPorts)

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
