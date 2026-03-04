#!/usr/bin/env node

import process from 'node:process'
import { program } from 'commander'

import { checkOtherServices, checkUsedPorts } from '../src/check.js'
import { version } from '../src/constants.js'
import { compose, error } from '../src/utils.js'

program
  .version(version)
  .arguments('[service]')
  .action(async (service) => {
    try {
      await checkOtherServices()

      if (service) {
        await checkUsedPorts(service)
        await compose('up', '-d', service)
      }
      else {
        await checkUsedPorts()
        await compose('up', '-d')
      }
    }
    catch (e) {
      error(e)
    }
  })

program.parse(process.argv)
