#!/usr/bin/env node

const cli = require('commander')

const { version } = require('../src/constants')

const { compose, error } = require('../src/helpers')

cli.version(version).action(async () => {
  try {
    await compose('ps')
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)
