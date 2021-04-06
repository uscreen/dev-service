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
        await compose('restart', service)
      } else {
        await compose('restart')
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
