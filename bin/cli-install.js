#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'
import { error } from '../src/utils.js'
import { install } from '../src/install.js'

cli.version(version).action(async () => {
  try {
    await install()
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)
