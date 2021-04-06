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
        await compose('logs', '-f', service)
      } else {
        await compose('logs', '-f')
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
