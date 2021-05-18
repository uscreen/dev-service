#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'
import { error } from '../src/utils.js'
import { install } from '../src/install.js'

cli
  .version(version)
  .option('--enable-volumes-id', 'Using unique ID when naming volumes')
  .action(async (options) => {
    try {
      await install(options)
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
