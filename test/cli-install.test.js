const tap = require('tap')
const fs = require('fs-extra')
const path = require('path')

const { arenaPath, cli, prepareArena, clearArena } = require('./helpers')

const servicesPath = path.resolve(arenaPath, '.services')

tap.test('$ cli install', async t => {
  t.tearDown(clearArena)

  t.test('Within a folder with no package.json', async t => {
    prepareArena()

    await cli(['install'], arenaPath)

    t.strictEqual(
      true,
      fs.existsSync(servicesPath),
      'Should create .services folder'
    )

    t.strictEqual(
      0,
      fs.readdirSync(servicesPath).length,
      '.services folder should be empty'
    )
  })

  t.test(
    'Within a folder with a package.json containing no services property',
    async t => {
      prepareArena({})

      await cli(['install'], arenaPath)

      t.strictEqual(
        true,
        fs.existsSync(servicesPath),
        'Should create .services folder'
      )

      t.strictEqual(
        0,
        fs.readdirSync(servicesPath).length,
        '.services folder should be empty'
      )
    }
  )

  t.test(
    'Within a folder with a package.json containing an empty services array',
    async t => {
      prepareArena({ services: [] })

      await cli(['install'], arenaPath)

      t.strictEqual(
        true,
        fs.existsSync(servicesPath),
        'Should create .services folder'
      )

      t.strictEqual(
        0,
        fs.readdirSync(servicesPath).length,
        '.services folder should be empty'
      )
    }
  )

  t.test(
    'Within a folder with a package.json containing some services',
    async t => {
      prepareArena({ services: ['mongo', 'nginx'] })

      await cli(['install'], arenaPath)

      t.strictEqual(
        true,
        fs.existsSync(servicesPath),
        'Should create .services folder'
      )

      t.strictEqual(
        true,
        fs.existsSync(path.resolve(servicesPath, 'mongo.yml')),
        'Should create mongo.yml within .services folder'
      )

      t.strictEqual(
        true,
        fs.existsSync(path.resolve(servicesPath, 'nginx.yml')),
        'Should create nginx.yml within .services folder'
      )

      t.strictEqual(
        2,
        fs.readdirSync(servicesPath).length,
        'Should not create any other yml files'
      )
    }
  )
})
