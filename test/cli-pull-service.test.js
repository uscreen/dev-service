import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
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

describe('$ cli pull [service]', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['pull', service], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('Within a folder with empty .compose subfolder', async (t) => {
    prepareArena(packageJson)
    fs.ensureDirSync(composePath)

    const result = await cli(['pull', service], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('If no docker host is available', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['pull', service], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('If services are defined in .compose subfolder', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['pull', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    const lines = result.stderr.split('\n').filter((s) => s)
    assert.ok(
      lines.some((l) => l.match(/mongo pulled/i)),
      `Should pull mongo image`
    )
    assert.ok(
      lines.every((l) => !l.match(/nginx pulled/i)),
      `Should not pull nginx image`
    )
  })
})
