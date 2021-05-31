#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'
import { error } from '../src/utils.js'
import { install } from '../src/install.js'

cli
  .version(version)
  .option(
    '--enable-classic-volumes',
    "Deriving volume names from current project's name"
  )
  .option('--enable-volumes-id', 'Deriving volume names from a unique ID')
  .option('--enable-mapped-volumes', 'Mapping volumes into local file system')
  .action(async (options) => {
    try {
      await install(options)
    } catch (e) {
      error(e)
    }
  })

cli.parse(process.argv)
