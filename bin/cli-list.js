#!/usr/bin/env node

import { program } from 'commander'

import { version } from '../src/constants.js'

import { compose, error } from '../src/utils.js'

program.version(version).action(async () => {
  try {
    await compose('ps')
  } catch (e) {
    error(e)
  }
})

program.parse(process.argv)
