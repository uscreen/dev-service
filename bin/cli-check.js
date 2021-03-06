#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'
import { checkUsedPorts, checkOtherServices } from '../src/check.js'
import { error } from '../src/utils.js'

cli
  .version(version)
  .arguments('[service]')
  .action(async (service) => {
    try {
      await checkOtherServices()

      if (service) {
        await checkUsedPorts(service)
      } else {
        await checkUsedPorts()
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
