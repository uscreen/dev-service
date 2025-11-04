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

describe('$ cli logs', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['logs'], arenaPath)

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

    const result = await cli(['logs'], arenaPath)

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

    const result = await cli(['logs'], arenaPath, {
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

    const result = await cli(['logs'], arenaPath, {}, 2000)

    assert.equal(result.code, 0, 'Should return code 0')

    const lines = result.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length, 0, 'Should show no logs')
  })

  /**
   * dev-repo_mongo  | {"t":{"$date":"2022-07-01T07:47:12.343+00:00"},"s":"I",  "c":"NETWORK",  "id":23016,   "ctx":"listener","msg":"Waiting for connections","attr":{"port":27017,"ssl":"off"}}
   */

  test('With running services', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    // record logs for the next 2s:
    const result = await cli(['logs'], arenaPath, {}, 2000)

    // don't check for exit code as test timeout could have an effect on it

    const lines = result.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length > 0, true, 'Should show logs')

    assert.equal(
      lines.filter((l) => l.match(/mongo.*waiting for connections/i)).length >
        0,
      true,
      'Should show mongo waiting for connections in logs'
    )
  })

  test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    // record logs for the next 2s:
    const result = await cli(['logs'], arenaPath, {}, 3000)

    // don't check for exit code as test timeout could have an effect on it

    const lines = result.stdout.split('\n').filter((s) => s)

    assert.equal(lines.length > 0, true, 'Should show logs')

    assert.equal(
      lines.filter((l) => l.match(/mongo.*waiting for connections/i)).length >
        0,
      true,
      'Should show mongo waiting for connections in logs'
    )
  })
})
