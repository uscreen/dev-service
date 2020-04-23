#!/usr/bin/env node

const cli = require('commander')

const { version } = require('../src/constants')

const { compose, error } = require('../src/utils')

cli
  .version(version)
  .arguments('[service]')
  .action(async service => {
    try {
      if (service) {
        await compose('-f', `${service}.yml`, 'down')
      } else {
        await compose('down')
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
