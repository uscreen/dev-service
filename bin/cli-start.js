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
        await compose('-f', `${service}.yml`, 'up', '-d')
      } else {
        await compose('up', '-d')
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
