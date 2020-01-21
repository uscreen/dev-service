#!/usr/bin/env node

const chalk = require('chalk')
const cli = require('commander')
const path = require('path')
const fs = require('fs-extra')

const { run } = require('../src/helpers')

/**
 * Initialize
 */

// Dev-Service
const { version } = require('../package.json')

// Project
const SERVICES_DIR = path.resolve(process.cwd(), '.services')

/**
 * Helper methods
 */
const ensureServicesDir = () => {
  fs.ensureDirSync(SERVICES_DIR)
}

const error = e => {
  console.error(chalk.red(`ERROR: ${e.message} Aborting.`))
}

const start = async () => {
  ensureServicesDir(SERVICES_DIR)

  const files = fs.readdirSync(SERVICES_DIR)

  const params = []
  for (const f of files) {
    params.push('-f', f)
  }
  params.push('up', '-d')

  await run('docker-compose', params, SERVICES_DIR)
}

cli.version(version).action(async () => {
  try {
    await start()
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)
