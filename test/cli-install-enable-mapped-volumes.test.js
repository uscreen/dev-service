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

tap.test('$ cli install --enable-mapped-volumes', async (t) => {
  t.afterEach(clearArena)

  t.test('Without already installed services', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    const result = await cli(['install', '--enable-mapped-volumes'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(fs.existsSync(composePath), 'Should create services folder')
    t.ok(fs.existsSync(volumesPath), 'Should create volumes folder')

    t.ok(
      fs.existsSync(path.resolve(composePath, 'mongo.yml')),
      'Should create mongo.yml within services folder'
    )
    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )
    const { mode: volumesMode } = readVolumeOptions()
    t.equal(
      'mapped-volumes',
      volumesMode,
      '... containing the correct volumes mode'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.notOk(mongoData.volumes, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    t.equal(1, code, 'Should not create named volume')

    await cli(['start'], arenaPath)
    t.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })

  t.test('With already installed services (with named volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install'], arenaPath)

    const result = await cli(['install', '--enable-mapped-volumes'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )
    const { mode: volumesMode } = readVolumeOptions()
    t.equal(
      'mapped-volumes',
      volumesMode,
      '... containing the correct volumes mode'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.notOk(mongoData.volumes, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    t.equal(0, code, 'Should not remove existing named volume')

    await cli(['start'], arenaPath)
    t.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })

  t.test('With already installed services (with mapped volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-mapped-volumes'], arenaPath)

    const result = await cli(['install', '--enable-mapped-volumes'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.notOk(mongoData.volumes, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    t.equal(1, code, 'Should not create named volume')

    await cli(['start'], arenaPath)
    t.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })
})

tap.test('$ cli install', async (t) => {
  t.afterEach(clearArena)

  t.test('With already installed services (with mapped volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-mapped-volumes'], arenaPath)

    const result = await cli(['install'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should create .options within services folder'
    )

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.notOk(mongoData.volumes, 'Should not set named volumes')

    const volumeName = 'dev-service-test-mongo-data'

    let code = null
    await docker('volume', 'inspect', volumeName)
      .then((c) => (code = c))
      .catch((e) => (code = e.code))
    t.equal(1, code, 'Should not create named volume')

    await cli(['start'], arenaPath)
    t.ok(
      fs.existsSync(path.resolve(volumesPath, 'mongo-data')),
      'Should create volumes folder after start'
    )
  })
})

tap.test('$ cli install --enable-classic-volumes', async (t) => {
  t.afterEach(clearArena)

  t.test('With already installed services (with mapped volumes)', async (t) => {
    prepareArena({
      name: 'dev-service-test',
      services: ['mongo:latest']
    })

    await cli(['install', '--enable-mapped-volumes'], arenaPath)

    const result = await cli(['install', '--enable-classic-volumes'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.ok(
      fs.existsSync(path.resolve(servicesPath, '.options')),
      'Should not remove .options within services folder'
    )
    const volumes = readVolumeOptions()
    t.notOk(volumes, 'Should remove volumes section in options')

    const volumeName = 'dev-service-test-mongo-data'

    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.equal(
      volumeName,
      mongoData.volumes['mongo-data'].external.name,
      'Should correct volume name in mongo.yml'
    )
  })
})
