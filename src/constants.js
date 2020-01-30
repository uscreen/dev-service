'use strict'

const path = require('path')

/**
 * Initialize
 */

// Dev-Service
const { version } = require('../package.json')
const TEMPLATES_DIR = path.resolve(__dirname, '../templates')

// Project
const root = path.resolve(process.cwd())

const SERVICES_DIR = path.resolve(root, 'services')
const COMPOSE_DIR = path.resolve(root, 'services/.compose')

module.exports = {
  root,
  version,
  TEMPLATES_DIR,
  SERVICES_DIR,
  COMPOSE_DIR
}
