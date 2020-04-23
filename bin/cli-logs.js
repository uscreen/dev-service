#!/usr/bin/env node

const cli = require('commander')

const { version } = require('../src/constants')

const { compose, error } = require('../src/utils')

cli.version(version).action(async () => {
  try {
    await compose('logs', '-f')
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)