import tap from 'tap'
import fs from 'fs-extra'

import {
  arenaPath,
  cli,
  prepareArena,
  clearArena,
  composePath,
  webserver
} from './helpers.js'

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

tap.test('$ cli check', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['check'], arenaPath)

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

    const result = await cli(['check'], arenaPath)

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test("If all services' ports are available", async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['check'], arenaPath)

    t.equal(0, result.code, 'Should return code 0')
  })

  t.test("If one or more services' port(s) are already in use", (t) => {
    prepareArena(packageJson)
    cli(['install'], arenaPath).then(() => {
      const server = webserver.start(80)

      cli(['check'], arenaPath).then((result) => {
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

  t.test('If one ore more services are already running', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    const result = await cli(['check'], arenaPath)

    t.strictEqual(0, result.code, 'Should return code 0')
  })

  t.test('With irregular name in package.json', (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    cli(['install'], arenaPath).then(() => {
      const server = webserver.start(80)

      cli(['check'], arenaPath).then((result) => {
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
})
