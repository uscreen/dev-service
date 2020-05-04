#!/usr/bin/env node

const { Command } = require('commander')
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
  .command('start [service]', 'start given or all installed services')
  .command('stop [service]', 'stop given or all running services')
  .command('restart [service]', 'restart given or all installed services')
  .command('list', 'lists running services')
  .command('logs [service]', 'prints logs of given or running services')

/**
 * read args
 */
cli.parse(process.argv)

/**
 * output help as default
 */
if (!process.argv.slice(2).length) {
  cli.help()
}
