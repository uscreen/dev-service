#!/usr/bin/env node

import cli from 'commander'

import { version } from '../src/constants.js'

import { compose, error } from '../src/utils.js'

cli.version(version).action(async () => {
  try {
    await compose('ps')
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)
