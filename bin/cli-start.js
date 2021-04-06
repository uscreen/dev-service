#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'
import { compose, checkUsedPorts, error } from '../src/utils.js'

cli
  .version(version)
  .arguments('[service]')
  .action(async (service) => {
    try {
      if (service) {
        await checkUsedPorts(service)
        await compose('up', '-d', service)
      } else {
        await checkUsedPorts()
        await compose('up', '-d')
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
