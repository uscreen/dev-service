'use strict'

const path = require('path')
const readPkgUp = require('read-pkg-up')

/**
 * Initialize
 */

// Dev-Service
const { version } = require('../package.json')
const TEMPLATES_DIR = path.resolve(__dirname, '../templates')

// Project
const root = path.resolve(process.cwd())
const { packageJson } = readPkgUp.sync({ cwd: root })
const services = packageJson.services

const SERVICES_DIR = path.resolve(process.cwd(), 'services')
const COMPOSE_DIR = path.resolve(process.cwd(), 'services/.compose')

const projectname = packageJson.name || path.basename(root)

module.exports = {
  version,
  TEMPLATES_DIR,
  root,
  packageJson,
  services,
  SERVICES_DIR,
  COMPOSE_DIR,
  projectname
}
