import tap from 'tap'
import fs from 'fs-extra'

import {
  arenaPath,
  cli,
  compose,
  prepareArena,
  clearArena,
  composePath,
  otherArenaPath,
  prepareOtherArena,
  clearOtherArena,
  webserver
} from './helpers.js'

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

tap.test('$ cli start', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['start'], arenaPath)

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

    const result = await cli(['start'], arenaPath)

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

    const result = await cli(['start'], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('If services are defined in .compose subfolder', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['start'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.equal(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.equal(2, lines.length, 'Should return two lines')
      t.equal(
        true,
        lines.every((s) => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })

  t.test("If one or more services' port(s) are already in use", (t) => {
    prepareArena(packageJson)
    cli(['install'], arenaPath).then(() => {
      const server = webserver.start(27017)

      cli(['start'], arenaPath).then((result) => {
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

  t.test('If services are already running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const result = await cli(['start'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.equal(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.equal(2, lines.length, 'Should return two lines')
      t.equal(
        true,
        lines.every((s) => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })

  t.test(
    'If services of another dev-service instance are running',
    async (t) => {
      const otherPackageJson = {
        name: 'other-dev-service-test',
        services: ['redis']
      }

      prepareOtherArena(otherPackageJson)
      await cli(['install'], otherArenaPath)
      await cli(['start'], otherArenaPath)

      prepareArena(packageJson)
      await cli(['install'], arenaPath)

      const result = await cli(['start'], arenaPath)
      t.ok(
        result.stderr.includes('WARNING: dev-service is already running'),
        'Should show warning'
      )
      t.ok(
        result.stderr.includes('_otherarena'),
        'Should show reference to other dev-service instance'
      )

      t.equal(0, result.code, 'Should not crash and return code 0')

      clearOtherArena()
    }
  )

  t.test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)

    const result = await cli(['start'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')

    t.test('Checking running containers', async (t) => {
      const cresult = await compose('ps', '-q')
      t.equal(0, cresult.code, 'Should return code 0')

      // Checking number of running containers (identified by 64-digit ids):
      const lines = cresult.stdout.split('\n').filter((s) => s)

      t.equal(2, lines.length, 'Should return two lines')
      t.equal(
        true,
        lines.every((s) => s.length === 64),
        'Both lines contain container ids'
      )
    })
  })

  t.test('If the HOST part of a port mapping is in use', (t) => {
    prepareArena({
      ...packageJson,
      services: [
        'mongo:latest',
        {
          image: 'redis:latest',
          ports: ['16379:6379'] // HOST:CONTAINER
        }
      ]
    })

    cli(['install'], arenaPath).then(() => {
      const server = webserver.start(16379)

      cli(['start'], arenaPath).then((result) => {
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

  t.test('If the CONTAINER part of a port mapping is in use', (t) => {
    prepareArena({
      ...packageJson,
      services: [
        'mongo:latest',
        {
          image: 'redis:latest',
          ports: ['16379:6379'] // HOST:CONTAINER
        }
      ]
    })

    cli(['install'], arenaPath).then(() => {
      const server = webserver.start(6379)

      cli(['start'], arenaPath).then((result) => {
        t.equal(0, result.code, 'Should return code 0')

        t.test('Checking running containers', async (t) => {
          const cresult = await compose('ps', '-q')
          t.equal(0, cresult.code, 'Should return code 0')

          // Checking number of running containers (identified by 64-digit ids):
          const lines = cresult.stdout.split('\n').filter((s) => s)

          t.equal(2, lines.length, 'Should return two lines')
          t.equal(
            true,
            lines.every((s) => s.length === 64),
            'Both lines contain container ids'
          )
        })

        webserver.stop(server, () => t.end())
      })
    })
  })
})
