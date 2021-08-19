#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'
import { compose, error } from '../src/utils.js'

cli
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

cli.parse(process.argv)
