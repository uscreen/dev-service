#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'

import { compose, error } from '../src/utils.js'

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
