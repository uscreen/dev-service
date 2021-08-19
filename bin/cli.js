#!/usr/bin/env node

import { Command } from 'commander'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const cli = new Command()

/**
 * package.json content
 */
const { version } = require('../package.json')

/**
 * define the command
 */
cli
  .version(version)
  .command('install', 'install all services specified in package.json')
  .command('check [service]', 'check availabilty of all or given service ports')
  .command('start [service]', 'start all or given installed services')
  .command('stop [service]', 'stop all or given running services')
  .command('restart [service]', 'restart all or given installed services')
  .command('list', 'lists all running services')
  .command('logs [service]', 'prints logs of all or given running services')
  .command(
    'pull [service]',
    'pulls current images for all or given installed services'
  )

/**
 * read args
 */
cli.parse(process.argv)
