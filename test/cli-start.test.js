const tap = require('tap')
const fs = require('fs-extra')

const {
  arenaPath,
  cli,
  compose,
  prepareArena,
  clearArena,
  composePath
} = require('./helpers')

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

tap.test('$ cli start', async t => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async t => {
    prepareArena(packageJson)

    const result = await cli(['start'], arenaPath)

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

    const result = await cli(['start'], arenaPath)

    t.strictEqual(1, result.code, 'Should return code 1')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If no docker host is available', async t => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['start'], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    t.strictEqual(1, result.code, 'Should return code 1')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If services are defined in .compose subfolder', async t => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['start'], arenaPath)

    t.strictEqual(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async t => {
      const cresult = await compose('ps', '-q')
      t.strictEqual(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter(s => s)

      t.strictEqual(2, lines.length, 'Should return two lines')
      t.strictEqual(
        true,
        lines.every(s => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })
})
