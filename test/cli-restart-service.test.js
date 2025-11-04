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

const service = 'mongo'
const otherService = 'nginx'

describe('$ cli restart [service]', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['restart', service], arenaPath)

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

    const result = await cli(['restart', service], arenaPath)

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

    const result = await cli(['restart', service], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('With no running services', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['restart', service], arenaPath)
    assert.equal(result.code, 0, 'Should return code === 0')
    assert.equal(result.stderr, '', 'Should not output error message')
  })

  test('If only other services are running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start', otherService], arenaPath)

    const result = await cli(['restart', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code === 0')
    assert.equal(result.stderr, '', 'Should not output error message')
  })

  test('If service is already running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start', service], arenaPath)

    const result = await cli(['restart', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    const ls = result.stderr
      .split('\n')
      .filter((s) => s && s.match(/(restarting|started)/i))
    assert.equal(
      ls.length,
      2,
      'Should output two lines confirming restart to stderr'
    )

    // Checking running containers
    const cresult = await compose('ps', '-q')
    assert.equal(cresult.code, 0, 'Should return code 0')

    // Checking number of running containers (identified by 64-digit ids):
    const lines = cresult.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length, 1, 'Should return one line')
    assert.equal(
      lines.every((s) => s.length === 64),
      true,
      'Line contains container id'
    )
  })

  test('If all services are already running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const result = await cli(['restart', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')
    const ls = result.stderr
      .split('\n')
      .filter((s) => s && s.match(/(restarting|started)/i))
    assert.equal(
      ls.length,
      2,
      'Should output two lines confirming restart to stderr'
    )

    // Checking running containers
    const cresult = await compose('ps', '-q')
    assert.equal(cresult.code, 0, 'Should return code 0')

    // Checking number of running containers (identified by 64-digit ids):
    const lines = cresult.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length, 2, 'Should return two lines')
    assert.equal(
      lines.every((s) => s.length === 64),
      true,
      'Both lines contain container ids'
    )
  })

  test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const result = await cli(['restart', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    // Checking running containers
    const cresult = await compose('ps', '-q')
    assert.equal(cresult.code, 0, 'Should return code 0')

    // Checking number of running containers (identified by 64-digit ids):
    const lines = cresult.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length, 2, 'Should return two lines')
    assert.equal(
      lines.every((s) => s.length === 64),
      true,
      'Both lines contain container ids'
    )
  })
})
