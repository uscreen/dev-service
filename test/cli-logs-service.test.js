import tap from 'tap'
import fs from 'fs-extra'

import {
  arenaPath,
  cli,
  prepareArena,
  clearArena,
  composePath
} from './helpers.js'

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

const service = 'mongo'

tap.test('$ cli logs [service]', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['logs', service], arenaPath)

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('Within a folder with empty .compose subfolder', async (t) => {
    prepareArena(packageJson)
    fs.ensureDirSync(composePath)

    const result = await cli(['logs', service], arenaPath)

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If no docker host is available', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['logs', service], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If [service] is not defined in .compose subfolder', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const otherService = 'nats'
    const result = await cli(['logs', otherService], arenaPath, {}, 2000)

    t.equal(0, result.code, 'Should return code 0')

    const lines = result.stdout.split('\n').filter((s) => s)

    t.equal(0, lines.length, 'Should show no logs')
  })

  t.test('With no running [service]', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['logs', service], arenaPath, {}, 2000)

    t.equal(0, result.code, 'Should return code 0')

    const lines = result.stdout.split('\n').filter((s) => s)

    t.equal(0, lines.length, 'Should show no logs')
  })

  t.test('With running [service]', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    // record logs for the next 2s:
    const result = await cli(['logs', service], arenaPath, {}, 2000)

    t.equal(0, result.code, 'Should return code 0')

    const lines = result.stdout.split('\n').filter((s) => s)

    t.equal(true, lines.length > 0, 'Should show logs')

    t.equal(
      true,
      lines.filter((l) => l.match(/mongo.*waiting for connections/i)).length >
        0,
      'Should show mongo waiting for connections in logs'
    )
  })

  t.test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    // record logs for the next 2s:
    const result = await cli(['logs', service], arenaPath, {}, 3000)

    t.equal(0, result.code, 'Should return code 0')

    const lines = result.stdout.split('\n').filter((s) => s)

    t.equal(true, lines.length > 0, 'Should show logs')

    t.equal(
      true,
      lines.filter((l) => l.match(/mongo.*waiting for connections/i)).length >
        0,
      'Should show mongo waiting for connections in logs'
    )
  })
})
