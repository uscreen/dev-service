#!/usr/bin/env node

const cli = require('commander')

const { version } = require('../src/constants')
const { compose, checkUsedPorts, error } = require('../src/utils')

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
