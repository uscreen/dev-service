#!/usr/bin/env node

import process from 'node:process'
import { program } from 'commander'

import { version } from '../src/constants.js'
import { status } from '../src/status.js'
import { error } from '../src/utils.js'

program.version(version).action(async () => {
  try {
    await status()
  }
  catch (e) {
    error(e)
  }
})

program.parse(process.argv)
