import tap from 'tap'
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

tap.test('$ cli install --enable-volumes-id', async (t) => {
  t.afterEach(clearArena)

  t.test('Without already installed services', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    const result = await cli(['install', '--enable-volumes-id'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(fs.existsSync(composePath), 'Should create services folder')

    t.ok(
      fs.existsSync(path.resolve(composePath, 'mongo.yml')),
      'Should create mongo.yml within services folder'
    )
    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.volumesid')),
      'Should create .volumesid within services folder'
    )
    const volumesID = fs.readFileSync(
      path.resolve(servicesPath, '.volumesid'),
      {
        encoding: 'utf-8'
      }
    )
    t.ok(
      volumesID.match(/^[a-z0-9]{12}$/i),
      '... and containing volume ID of 12 characters/numbers'
    )

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.equal(
      volumeName,
      mongoData.volumes['mongo-data'].external.name,
      'Should set volume name correctly in mongo.yml'
    )

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((c) => (code = c))
    t.equal(0, code, 'Should create correctly named volume')
  })

  t.test('With already installed services (without volumes-id)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install'], arenaPath)

    const result = await cli(['install', '--enable-volumes-id'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.volumesid')),
      'Should create .volumesid within services folder'
    )
    const volumesID = fs.readFileSync(
      path.resolve(servicesPath, '.volumesid'),
      {
        encoding: 'utf-8'
      }
    )
    t.ok(
      volumesID.match(/^[a-z0-9]{12}$/i),
      '... and containing volume ID of 12 characters/numbers'
    )

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.equal(
      volumeName,
      mongoData.volumes['mongo-data'].external.name,
      'Should set volume name correctly in mongo.yml'
    )

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((c) => (code = c))
    t.equal(0, code, 'Should create correctly named volume')
  })

  t.test('With already installed services (with volumes-id)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-volumes-id'], arenaPath)

    const initialVolumesID = fs.readFileSync(
      path.resolve(servicesPath, '.volumesid'),
      {
        encoding: 'utf-8'
      }
    )

    const result = await cli(['install', '--enable-volumes-id'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.volumesid')),
      'Should create .volumesid within services folder'
    )
    const volumesID = fs.readFileSync(
      path.resolve(servicesPath, '.volumesid'),
      {
        encoding: 'utf-8'
      }
    )
    t.equal(initialVolumesID, volumesID, 'Should not change volumes id')

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.equal(
      volumeName,
      mongoData.volumes['mongo-data'].external.name,
      'Should set volume name correctly in mongo.yml'
    )

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((c) => (code = c))
    t.equal(0, code, 'Should create correctly named volume')
  })
})

tap.test('$ cli install', async (t) => {
  t.afterEach(clearArena)

  t.test('With already installed services (with volumes-id)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-volumes-id'], arenaPath)

    const initialVolumesID = fs.readFileSync(
      path.resolve(servicesPath, '.volumesid'),
      {
        encoding: 'utf-8'
      }
    )

    const result = await cli(['install'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.volumesid')),
      'Should not remove .volumesid within services folder'
    )
    const volumesID = fs.readFileSync(
      path.resolve(servicesPath, '.volumesid'),
      {
        encoding: 'utf-8'
      }
    )
    t.equal(initialVolumesID, volumesID, 'Should not change volumes id')

    const volumeName = `${volumesID}-mongo-data`

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.equal(
      volumeName,
      mongoData.volumes['mongo-data'].external.name,
      'Should keep correct volume name in mongo.yml'
    )
  })
})
