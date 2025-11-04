import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs-extra'

import {
  arenaPath,
  cli,
  compose,
  prepareArena,
  clearArena,
  composePath
} from './helpers.js'

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

describe('$ cli stop', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['stop'], arenaPath)

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

    const result = await cli(['stop'], arenaPath)

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
    await cli(['start'], arenaPath)

    const result = await cli(['stop'], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('If services are not running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['stop'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    // Checking running containers
    const cresult = await compose('ps', '-q')
    assert.equal(cresult.code, 0, 'Should return code 0')

    // Checking number of running containers (identified by 64-digit ids):
    const lines = cresult.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length, 0, 'Should return zero lines')
  })

  test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const result = await cli(['stop'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    // Checking running containers
    const cresult = await compose('ps', '-q')
    assert.equal(cresult.code, 0, 'Should return code 0')

    // Checking number of running containers (identified by 64-digit ids):
    const lines = cresult.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length, 0, 'Should return zero lines')
  })

  test('If services are running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const result = await cli(['stop'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    // Checking running containers
    const cresult = await compose('ps', '-q')
    assert.equal(cresult.code, 0, 'Should return code 0')

    // Checking number of running containers (identified by 64-digit ids):
    const lines = cresult.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length, 0, 'Should return zero lines')
  })
})
