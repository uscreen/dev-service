'use strict'

import { exec } from 'node:child_process'
import chalk from 'chalk'
import { getComposeCommand } from './utils.js'

const execOutput = cmd =>
  new Promise((resolve) => {
    exec(cmd, (err, stdout) => {
      resolve(err ? null : stdout.trim())
    })
  })

export const status = async () => {
  const preferredCmd = await getComposeCommand()

  const [
    dockerPath,
    dockerVersion,
    composePluginVersion,
    dockerComposePath,
    dockerComposeVersion
  ] = await Promise.all([
    execOutput('which docker'),
    execOutput('docker --version'),
    execOutput('docker compose version --short'),
    execOutput('which docker-compose'),
    execOutput('docker-compose --version')
  ])

  console.log('\nDetected tools:\n')

  if (dockerPath) {
    console.log(`  docker          ${chalk.dim(dockerPath)}`)
    console.log(`                  ${dockerVersion || chalk.yellow('version unknown')}`)
  }
  else {
    console.log(`  docker          ${chalk.red('not found')}`)
  }

  console.log('')

  const pluginActive = preferredCmd === 'docker compose'

  if (composePluginVersion) {
    const label = pluginActive ? chalk.green(' [active]') : ''
    console.log(`  docker compose  plugin  ${composePluginVersion}${label}`)
  }
  else {
    console.log(`  docker compose  ${chalk.dim('not available')}`)
  }

  if (dockerComposePath) {
    const label = !pluginActive ? chalk.green(' [active]') : ''
    console.log(`  docker-compose  ${chalk.dim(dockerComposePath)}`)
    console.log(`                  ${dockerComposeVersion || chalk.yellow('version unknown')}${label}`)
  }
  else {
    console.log(`  docker-compose  ${chalk.dim('not found')}`)
  }

  console.log('')
}
