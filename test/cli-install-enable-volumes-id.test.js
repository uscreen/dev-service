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
  composePath
} from './helpers.js'

import { docker } from '../src/utils.js'

const readVolumeOptions = () => {
  const raw = fs.readFileSync(path.resolve(servicesPath, '.options'), {
    encoding: 'utf-8'
  })
  const options = JSON.parse(raw)
  return options.volumes
}

describe('$ cli install --enable-volumes-id', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Without already installed services', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    const result = await cli(['install', '--enable-volumes-id'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(fs.existsSync(composePath), 'Should create services folder')

    assert.ok(
      fs.existsSync(path.resolve(composePath, 'mongo.yml')),
      'Should create mongo.yml within services folder'
    )
    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )
    const { id: volumesID, mode: volumesMode } = readVolumeOptions()
    assert.ok(
      volumesID.match(/^[a-z0-9]{12}$/i),
      '... containing volume ID of 12 characters/numbers'
    )
    assert.equal(
      volumesMode,
      'volumes-id',
      '... containing the correct volumes mode'
    )

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(
      mongoData.volumes['mongo-data'].name,
      volumeName,
      'Should set volume name correctly in mongo.yml'
    )

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    assert.equal(code, 0, 'Should create correctly named volume')
  })

  test('With already installed services (without volumes-id)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install'], arenaPath)

    const result = await cli(['install', '--enable-volumes-id'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )
    const { id: volumesID, mode: volumesMode } = readVolumeOptions()
    assert.ok(
      volumesID.match(/^[a-z0-9]{12}$/i),
      '... containing volume ID of 12 characters/numbers'
    )
    assert.equal(
      volumesMode,
      'volumes-id',
      '... containing the correct volumes mode'
    )

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(
      mongoData.volumes['mongo-data'].name,
      volumeName,
      'Should set volume name correctly in mongo.yml'
    )

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    assert.equal(code, 0, 'Should create correctly named volume')
  })

  test('With already installed services (with volumes-id)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-volumes-id'], arenaPath)

    const { id: initialVolumesID } = readVolumeOptions()

    const result = await cli(['install', '--enable-volumes-id'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )
    const { id: volumesID } = readVolumeOptions()
    assert.equal(volumesID, initialVolumesID, 'Should not change volumes id')

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(
      mongoData.volumes['mongo-data'].name,
      volumeName,
      'Should set volume name correctly in mongo.yml'
    )

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    assert.equal(code, 0, 'Should create correctly named volume')
  })
})

describe('$ cli install', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('With already installed services (with volumes-id)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-volumes-id'], arenaPath)

    const { id: initialVolumesID } = readVolumeOptions()

    const result = await cli(['install'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    assert.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should not remove .options within services folder'
    )
    const { id: volumesID } = readVolumeOptions()
    assert.equal(volumesID, initialVolumesID, 'Should not change volumes id')

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    assert.equal(
      mongoData.volumes['mongo-data'].name,
      volumeName,
      'Should keep correct volume name in mongo.yml'
    )
  })
})

describe('$ cli install --enable-classic-volumes', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('With already installed services (with volumes-id)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-volumes-id'], arenaPath)

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
