#!/usr/bin/env node

const cli = require('commander')

const { version } = require('../src/constants')

const { compose, error } = require('../src/utils')
/**
 * @todo enable portsUsed, see below
 */
// const { compose, portsUsed, error } = require('../src/utils')

cli
  .version(version)
  .arguments('[service]')
  .action(async (service) => {
    try {
      if (service) {
        /**
         * @todo wants to have been checked before starting
         * currently breaks test -> use `service check && service start` instead
         */
        // await portsUsed(service)
        await compose('up', '-d', service)
      } else {
        /**
         * @todo wants to have been checked before starting
         * currently breaks test -> use `service check && service start` instead
         */
        // await portsUsed()
        await compose('up', '-d')
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
