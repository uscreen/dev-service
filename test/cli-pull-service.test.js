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

tap.test('$ cli pull [service]', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['pull', service], arenaPath)

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

    const result = await cli(['pull', service], arenaPath)

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

    const result = await cli(['pull', service], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If services are defined in .compose subfolder', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['pull', service], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    const lines = result.stderr.split('\n').filter((s) => s)
    t.ok(
      lines.some((l) => l.match(/mongo pulled/i)),
      `Should pull mongo image`
    )
    t.ok(
      lines.every((l) => !l.match(/nginx pulled/i)),
      `Should not pull nginx image`
    )
  })
})
