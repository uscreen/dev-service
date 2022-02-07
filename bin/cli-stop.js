#!/usr/bin/env node

import { program } from 'commander'

import { version } from '../src/constants.js'

import { compose, error } from '../src/utils.js'

program
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

program.parse(process.argv)
