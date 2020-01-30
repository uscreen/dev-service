const tap = require('tap')
const fs = require('fs-extra')

const {
  arenaPath,
  cli,
  prepareArena,
  clearArena,
  composePath
} = require('./helpers')

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

tap.test('$ cli list', async t => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async t => {
    prepareArena(packageJson)

    const result = await cli(['list'], arenaPath)

    t.strictEqual(1, result.code, 'Should return code 1')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('Within a folder with empty .compose subfolder', async t => {
    prepareArena(packageJson)
    fs.ensureDirSync(composePath)

    const result = await cli(['list'], arenaPath)

    t.strictEqual(1, result.code, 'Should return code 1')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test(
    'Within a folder with two defined services in .compose subfolder',
    async t => {
      t.test('With no running services', async t => {
        prepareArena(packageJson)
        await cli(['install'], arenaPath)

        const result = await cli(['list'], arenaPath)

        t.strictEqual(0, result.code, 'Should return code 0')

        const lines = result.stdout.split('\n').filter(s => s)
        t.strictEqual(
          0,
          lines.filter(l => l.match(/^dev-service-test_.*Up/)).length,
          'Should output no services with Status "Up"'
        )
      })

      t.test('With running services', async t => {
        prepareArena(packageJson)
        await cli(['install'], arenaPath)
        await cli(['start'], arenaPath)

        const result = await cli(['list'], arenaPath)

        t.strictEqual(0, result.code, 'Should return code 0')

        const lines = result.stdout.split('\n').filter(s => s)
        t.strictEqual(
          2,
          lines.filter(l => l.match(/^dev-service-test_(mongo|nginx).*Up/))
            .length,
          'Should output two services with Status "Up"'
        )
      })
    }
  )
})
