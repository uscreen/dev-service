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
  .command('start', 'start installed services')
  .command('stop', 'stop installed services')

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
