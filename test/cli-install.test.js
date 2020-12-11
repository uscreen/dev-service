const tap = require('tap')
const fs = require('fs-extra')
const path = require('path')

const {
  arenaPath,
  cli,
  prepareArena,
  clearArena,
  loadYaml,
  servicesPath,
  composePath
} = require('./helpers')

const { docker } = require('../src/utils')

tap.test('$ cli install', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no package.json', async (t) => {
    prepareArena()

    const result = await cli(['install'], arenaPath)

    t.notEqual(0, result.code, 'Should return code != 0')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )

    t.strictEqual(
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

      t.notEqual(0, result.code, 'Should return code != 0')
      t.strictEqual(
        true,
        result.stderr.includes('ERROR'),
        'Should output error message'
      )

      t.strictEqual(
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

      t.notEqual(0, result.code, 'Should return code != 0')
      t.strictEqual(
        true,
        result.stderr.includes('ERROR'),
        'Should output error message'
      )

      t.strictEqual(
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

      t.notEqual(0, result.code, 'Should return code != 0')
      t.strictEqual(
        true,
        result.stderr.includes('ERROR'),
        'Should output error message'
      )

      t.strictEqual(
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

      t.strictEqual(
        true,
        fs.existsSync(composePath),
        'Should create services folder'
      )

      t.strictEqual(
        true,
        fs.existsSync(path.resolve(composePath, 'mongo.yml')),
        'Should create mongo.yml within services folder'
      )
      const mongoData = loadYaml(path.resolve(composePath, 'mongo.yml'))
      t.strictEqual(
        'mongo:latest',
        mongoData.services.mongo.image,
        'Should use the correct image in mongo.yml'
      )
      t.strictEqual(
        'dev-service-test_mongo',
        mongoData.services.mongo.container_name,
        'Should set the correct container name in mongo.yml'
      )
      let code = null
      await docker('volume', 'inspect', 'dev-service-test-mongo-data')
        .then((c) => (code = c))
        .catch((c) => (code = c))
      t.strictEqual(0, code, 'Should create docker volume defined in mongo.yml')

      t.strictEqual(
        true,
        fs.existsSync(path.resolve(composePath, 'nginx.yml')),
        'Should create nginx.yml within services folder'
      )
      const nginxData = loadYaml(path.resolve(composePath, 'nginx.yml'))
      t.strictEqual(
        'nginx',
        nginxData.services.nginx.image,
        'Should use the correct image in nginx.yml'
      )
      t.strictEqual(
        'dev-service-test_nginx',
        nginxData.services.nginx.container_name,
        'Should set the correct container name in nginx.yml'
      )
      t.strictEqual(
        true,
        fs.existsSync(path.resolve(servicesPath, 'nginx')),
        'Should create local config files if not existing'
      )

      t.strictEqual(
        2,
        fs.readdirSync(composePath).filter((f) => f !== '.gitignore').length,
        'Should not create any other yml files'
      )
    }
  )
})
