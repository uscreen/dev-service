#!/usr/bin/env node

const cli = require('commander')

const { version } = require('../src/constants')

const { compose, error } = require('../src/utils')
/**
 * @todo enable checkUsedPorts, see below
 */
// const { compose, checkUsedPorts, error } = require('../src/utils')

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
        // await checkUsedPorts(service)
        await compose('up', '-d', service)
      } else {
        /**
         * @todo wants to have been checked before starting
         * currently breaks test -> use `service check && service start` instead
         */
        // await checkUsedPorts()
        await compose('up', '-d')
      }
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
