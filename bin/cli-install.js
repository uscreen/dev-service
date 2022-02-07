#!/usr/bin/env node

import { program } from 'commander'

import { version } from '../src/constants.js'
import { error } from '../src/utils.js'
import { install } from '../src/install.js'

program
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

program.parse(process.argv)
