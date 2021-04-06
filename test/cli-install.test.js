import tap from 'tap'
import fs from 'fs-extra'
import path from 'path'

import {
  arenaPath,
  cli,
  escape,
  prepareArena,
  clearArena,
  loadYaml,
  servicesPath,
  composePath
} from './helpers.js'

import { docker } from '../src/utils.js'

tap.test('$ cli install', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no package.json', async (t) => {
    prepareArena()

    const result = await cli(['install'], arenaPath)

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )

    t.equal(
      false,
      fs.existsSync(servicesPath),
      'Should not create services folder'
    )
  })

  t.test(
    'Within a folder with a package.json containing no services property',
    async (t) => {
      prepareArena({})

      const result = await cli(['install'], arenaPath)

      t.not(0, result.code, 'Should return code != 0')
      t.equal(
        true,
        result.stderr.includes('ERROR'),
        'Should output error message'
      )

      t.equal(
        false,
        fs.existsSync(servicesPath),
        'Should not create services folder'
      )
    }
  )

  t.test(
    'Within a folder with a package.json containing an empty services array',
    async (t) => {
      prepareArena({ services: [] })

      const result = await cli(['install'], arenaPath)

      t.not(0, result.code, 'Should return code != 0')
      t.equal(
        true,
        result.stderr.includes('ERROR'),
        'Should output error message'
      )

      t.equal(
        false,
        fs.existsSync(servicesPath),
        'Should not create services folder'
      )
    }
  )

  t.test(
    'Within a folder with a package.json containing an invalid services',
    async (t) => {
      prepareArena({ services: ['invalid-service-name'] })

      const result = await cli(['install'], arenaPath)

      t.not(0, result.code, 'Should return code != 0')
      t.equal(
        true,
        result.stderr.includes('ERROR'),
        'Should output error message'
      )

      t.equal(
        false,
        fs.existsSync(servicesPath),
        'Should not create services folder'
      )
    }
  )

  t.test(
    'Within a folder with a package.json containing some services',
    async (t) => {
      prepareArena({
        name: 'dev-service-test',
        services: ['mongo:latest', 'nginx']
      })

      await cli(['install'], arenaPath)

      t.equal(true, fs.existsSync(composePath), 'Should create services folder')

      t.equal(
        true,
        fs.existsSync(path.resolve(composePath, 'mongo.yml')),
        'Should create mongo.yml within services folder'
      )
      const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
      t.equal(
        'mongo:latest',
        mongoData.services.mongo.image,
        'Should use the correct image in mongo.yml'
      )
      t.equal(
        'dev-service-test_mongo',
        mongoData.services.mongo.container_name,
        'Should set the correct container name in mongo.yml'
      )
      let code = null
      await docker('volume', 'inspect', 'dev-service-test-mongo-data')
        .then((c) => (code = c))
        .catch((c) => (code = c))
      t.equal(0, code, 'Should create docker volume defined in mongo.yml')

      t.equal(
        true,
        fs.existsSync(path.resolve(composePath, 'nginx.yml')),
        'Should create nginx.yml within services folder'
      )
      const nginxData = loadYaml(path.resolve(composePath, 'nginx.yml'))
      t.equal(
        'nginx',
        nginxData.services.nginx.image,
        'Should use the correct image in nginx.yml'
      )
      t.equal(
        'dev-service-test_nginx',
        nginxData.services.nginx.container_name,
        'Should set the correct container name in nginx.yml'
      )
      t.equal(
        true,
        fs.existsSync(path.resolve(servicesPath, 'nginx')),
        'Should create local config files if not existing'
      )

      t.equal(
        2,
        fs.readdirSync(composePath).filter((f) => f !== '.gitignore').length,
        'Should not create any other yml files'
      )
    }
  )

  t.test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({
      name,
      services: ['mongo']
    })

    await cli(['install'], arenaPath)

    t.equal(true, fs.existsSync(composePath), 'Should create services folder')

    t.equal(
      true,
      fs.existsSync(path.resolve(composePath, 'mongo.yml')),
      'Should create mongo.yml within services folder'
    )
    const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
    t.equal(
      `${escape(name)}_mongo`,
      mongoData.services.mongo.container_name,
      'Should set the correct container name in mongo.yml'
    )
    let code = null
    await docker('volume', 'inspect', `${escape(name)}-mongo-data`)
      .then((c) => (code = c))
      .catch((c) => (code = c))
    t.equal(0, code, 'Should create docker volume defined in mongo.yml')
  })
})
