import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs-extra'
import path from 'path'

import {
  arenaPath,
  cli,
  prepareArena,
  clearArena,
  loadYaml,
  servicesPath,
  composePath,
  volumesPath
} from './helpers.js'

import { docker } from '../src/utils.js'

const readVolumeOptions = () => {
  const raw = fs.readFileSync(path.resolve(servicesPath, '.options'), {
    encoding: 'utf-8'
  })
  const options = JSON.parse(raw)
  return options.volumes
}

describe('$ cli install --enable-mapped-volumes', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Without already installed services', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    const result = await cli(['install', '--enable-mapped-volumes'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(fs.existsSync(composePath), 'Should create services folder')
    assert.ok(fs.existsSync(volumesPath), 'Should create volumes folder')

    assert.ok(
      fs.existsSync(path.resolve(composePath, 'mongo.yml')),
      'Should create mongo.yml within services folder'
    )
    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )
    const { mode: volumesMode } = readVolumeOptions()
    assert.equal(
      volumesMode,
      'mapped-volumes',
      '... containing the correct volumes mode'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(mongoData.volumes, undefined, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    assert.equal(code, 1, 'Should not create named volume')

    await cli(['start'], arenaPath)
    assert.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })

  test('With already installed services (with named volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install'], arenaPath)

    const result = await cli(['install', '--enable-mapped-volumes'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )
    const { mode: volumesMode } = readVolumeOptions()
    assert.equal(
      volumesMode,
      'mapped-volumes',
      '... containing the correct volumes mode'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(mongoData.volumes, undefined, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    assert.equal(code, 0, 'Should not remove existing named volume')

    await cli(['start'], arenaPath)
    assert.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })

  test('With already installed services (with mapped volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-mapped-volumes'], arenaPath)

    const result = await cli(['install', '--enable-mapped-volumes'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(mongoData.volumes, undefined, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    assert.equal(code, 1, 'Should not create named volume')

    await cli(['start'], arenaPath)
    assert.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })
})

describe('$ cli install', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('With already installed services (with mapped volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-mapped-volumes'], arenaPath)

    const result = await cli(['install'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(mongoData.volumes, undefined, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    assert.equal(code, 1, 'Should not create named volume')

    await cli(['start'], arenaPath)
    assert.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })
})

describe('$ cli install --enable-classic-volumes', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('With already installed services (with mapped volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-mapped-volumes'], arenaPath)

    const result = await cli(['install', '--enable-classic-volumes'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should not remove .options within services folder'
    )
    const volumes = readVolumeOptions()
    assert.equal(volumes, undefined, 'Should remove volumes section in options')

    const volumeName = 'dev-service-test-mongo-data'

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(
      mongoData.volumes['mongo-data'].name,
      volumeName,
      'Should correct volume name in mongo.yml'
    )
  })
})
