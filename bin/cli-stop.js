#!/usr/bin/env node

const cli = require('commander')

const { version } = require('../src/constants')

const { compose, error } = require('../src/utils')

cli
  .version(version)
  .arguments('[service]')
  .action(async (service) => {
    try {
      // stop service(s):
      if (service) {
        await compose('stop', service)
      } else {
        await compose('stop')
      }

      // clean up:
      await compose('rm', '-fv')
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
