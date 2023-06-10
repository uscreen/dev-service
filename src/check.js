'use strict'

import fs from 'fs-extra'
import path from 'path'
import { exec } from 'child_process'
import YAML from 'yaml'
import {
  checkComposeDir,
  escape,
  getComposeFiles,
  getComposePaths,
  readPackageJson,
  warning
} from './utils.js'

import { COMPOSE_DIR } from './constants.js'

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
 * check for processes using needed ports
 */
export const checkUsedPorts = async (service) => {
  if (!checkComposeDir()) {
    throw Error('No services found. Try running `service install`')
  }

  const requiredPorts = getRequiredPorts(service)
  const ownPorts = await getOwnPorts()
  const ports = requiredPorts.filter((p) => !ownPorts.includes(p))

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

/**
 * Get all ports required (by given service)
 */
const getRequiredPorts = (service) => {
  const files = getComposeFiles()
  const ports = []
  for (const f of files) {
    if (service && `${service}.yml` !== f) continue

    const yaml = YAML.parse(
      fs.readFileSync(path.resolve(COMPOSE_DIR, f), 'utf8')
    )
    ports.push(
      ...Object.values(yaml.services)
        .map((v) => v.ports)
        .filter((p) => p)
        .flat()
    )
  }

  const uniquePorts = [...new Set(ports.map((p) => p.split(':')[0]))]

  return uniquePorts
}

/**
 * get ports currently used by this services instance
 */
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
      if (err) {
        return reject(err)
      }

      if (stderr.toString().trim()) {
        return reject(stderr.toString().trim())
      }

      const ids = stdout.split('\n').filter((id) => id)

      Promise.all(ids.map(getContainerPorts)).then((ps) => {
        const ports = [].concat(...ps)
        resolve(ports)
      })
    })
  })

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

        resolve(processes[0])
      }
    )
  })
