#!/usr/bin/env node

import { program } from 'commander'

import { version } from '../src/constants.js'
import { checkUsedPorts, checkOtherServices } from '../src/check.js'
import { error } from '../src/utils.js'

program
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

program.parse(process.argv)
