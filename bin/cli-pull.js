#!/usr/bin/env node

import { program } from 'commander'

import { version } from '../src/constants.js'
import { compose, error } from '../src/utils.js'

program
  .version(version)
  .arguments('[service]')
  .action(async (service) => {
    try {
      if (service) {
        await compose('pull', service)
      } else {
        await compose('pull')
      }
    } catch (e) {
      error(e)
    }
  })

program.parse(process.argv)
