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

const service = 'mongo'

tap.test('$ cli start [service]', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['start', service], arenaPath)

    t.notEqual(0, result.code, 'Should return code != 0')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('Within a folder with empty .compose subfolder', async (t) => {
    prepareArena(packageJson)
    fs.ensureDirSync(composePath)

    const result = await cli(['start', service], arenaPath)

    t.notEqual(0, result.code, 'Should return code != 0')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If no docker host is available', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['start', service], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    t.notEqual(0, result.code, 'Should return code != 0')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If [service] is not defined in .compose subfolder', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const otherService = 'nats'
    const result = await cli(['start', otherService], arenaPath)

    t.notEqual(0, result.code, 'Should return code != 0')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If [service] is defined in .compose subfolder', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['start', service], arenaPath)

    t.strictEqual(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.strictEqual(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.strictEqual(1, lines.length, 'Should return one line')
      t.strictEqual(
        true,
        lines.every((s) => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })

  t.test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)

    const result = await cli(['start', service], arenaPath)

    t.strictEqual(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.strictEqual(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.strictEqual(1, lines.length, 'Should return one line')
      t.strictEqual(
        true,
        lines.every((s) => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })
})
