#!/usr/bin/env node

const cli = require('commander')

cli.action(() => {
  console.log('Installing services...')
})

cli.parse(process.argv)
