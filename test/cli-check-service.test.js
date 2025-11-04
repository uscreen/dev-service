import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs-extra'

import {
  arenaPath,
  cli,
  prepareArena,
  clearArena,
  composePath,
  otherArenaPath,
  prepareOtherArena,
  clearOtherArena,
  webserver
} from './helpers.js'

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

const service = 'mongo'

describe('$ cli check', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['check', service], arenaPath)

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

    const result = await cli(['check', service], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test("If service's ports are available", async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['check', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')
  })

  test("If service's port(s) are already in use", async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const server = webserver.start(27017)

    const result = await cli(['check', service], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.startsWith('ERROR: Required port(s) are already allocated'),
      true,
      'Should output appropriate message to stderr'
    )

    await new Promise((resolve) => webserver.stop(server, resolve))
  })

  test('If service is already running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start', service], arenaPath)

    const result = await cli(['check', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')
  })

  test('If all services are already running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const result = await cli(['check', service], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')
  })

  test('If services of another dev-service instance are running', async (t) => {
    const otherPackageJson = {
      name: 'other-dev-service-test',
      services: ['redis']
    }

    prepareOtherArena(otherPackageJson)
    await cli(['install'], otherArenaPath)
    await cli(['start'], otherArenaPath)

    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['check', service], arenaPath)
    assert.ok(
      result.stderr.includes('WARNING: dev-service is already running'),
      'Should show warning'
    )
    assert.ok(
      result.stderr.includes('_otherarena'),
      'Should show reference to other dev-service instance'
    )

    assert.equal(result.code, 0, 'Should not crash and return code 0')

    await clearOtherArena()
  })

  test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)

    const server = webserver.start(27017)

    const result = await cli(['check', service], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.startsWith('ERROR: Required port(s) are already allocated'),
      true,
      'Should output appropriate message to stderr'
    )

    await new Promise((resolve) => webserver.stop(server, resolve))
  })

  test('If a minimal customized service is given', async (t) => {
    prepareArena({
      ...packageJson,
      services: [
        ...packageJson.services,
        { image: 'docker.elastic.co/elasticsearch/elasticsearch:6.4.2' }
      ]
    })
    await cli(['install'], arenaPath)

    const result = await cli(['check', service], arenaPath)

    assert.equal(result.code, 0, 'Should not crash and return code 0')
  })

  test('If the HOST part of a port mapping is in use', async (t) => {
    prepareArena({
      ...packageJson,
      services: [
        'mongo:latest',
        {
          image: 'redis:latest',
          ports: ['16379:6379'] // HOST:CONTAINER
        }
      ]
    })

    await cli(['install'], arenaPath)
    const server = webserver.start(16379)

    const result = await cli(['check', 'redis'], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.startsWith('ERROR: Required port(s) are already allocated'),
      true,
      'Should output appropriate message to stderr'
    )

    await new Promise((resolve) => webserver.stop(server, resolve))
  })

  test('If the CONTAINER part of a port mapping is in use', async (t) => {
    prepareArena({
      ...packageJson,
      services: [
        'mongo:latest',
        {
          image: 'redis:latest',
          ports: ['16379:6379'] // HOST:CONTAINER
        }
      ]
    })

    await cli(['install'], arenaPath)
    const server = webserver.start(6379)

    const result = await cli(['check', 'redis'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    await new Promise((resolve) => webserver.stop(server, resolve))
  })
})
