'use strict'

import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Initialize
 */

// Dev-Service
export const { version } = require('../package.json')
export const TEMPLATES_DIR = path.resolve(__dirname, '../templates')

// Project
export const root = path.resolve(process.cwd())

export const SERVICES_DIR = path.resolve(root, 'services')
export const COMPOSE_DIR = path.resolve(root, 'services/.compose')
export const VOLUMES_DIR = path.resolve(root, 'services/.volumes')
