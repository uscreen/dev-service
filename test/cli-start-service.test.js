import tap from 'tap'
import fs from 'fs-extra'

import {
  arenaPath,
  cli,
  compose,
  prepareArena,
  clearArena,
  composePath,
  webserver
} from './helpers.js'

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

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('Within a folder with empty .compose subfolder', async (t) => {
    prepareArena(packageJson)
    fs.ensureDirSync(composePath)

    const result = await cli(['start', service], arenaPath)

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
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

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
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

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If [service] is defined in .compose subfolder', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['start', service], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.equal(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.equal(1, lines.length, 'Should return one line')
      t.equal(
        true,
        lines.every((s) => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })

  t.test("If one or more service's port(s) are already in use", (t) => {
    prepareArena(packageJson)
    cli(['install'], arenaPath).then(() => {
      const server = webserver.start(27017)

      cli(['start', service], arenaPath).then((result) => {
        t.not(0, result.code, 'Should return code != 0')
        t.equal(
          true,
          result.stderr.startsWith(
            'ERROR: Required port(s) are already allocated'
          ),
          'Should output appropriate message to stderr'
        )

        webserver.stop(server, () => t.end())
      })
    })
  })

  t.test('If service is already running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start', service], arenaPath)

    const result = await cli(['start', service], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.equal(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.equal(1, lines.length, 'Should return one line')
      t.equal(
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

    t.equal(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.equal(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.equal(1, lines.length, 'Should return one line')
      t.equal(
        true,
        lines.every((s) => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })
})
