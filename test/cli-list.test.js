import tap from 'tap'
import fs from 'fs-extra'

import {
  arenaPath,
  cli,
  escape,
  prepareArena,
  clearArena,
  composePath
} from './helpers.js'

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

tap.test('$ cli list', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['list'], arenaPath)

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

    const result = await cli(['list'], arenaPath)

    t.not(0, result.code, 'Should return code != 0')
    t.equal(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test(
    'Within a folder with two defined services in .compose subfolder',
    async (t) => {
      t.test('If no docker host is available', async (t) => {
        prepareArena(packageJson)
        await cli(['install'], arenaPath)

        const result = await cli(['list'], arenaPath, {
          DOCKER_HOST: 'tcp://notexisting:2376'
        })

        t.not(0, result.code, 'Should return code != 0')
        t.equal(
          true,
          result.stderr.includes('ERROR'),
          'Should output error message'
        )
      })

      t.test('With no running services', async (t) => {
        prepareArena(packageJson)
        await cli(['install'], arenaPath)

        const result = await cli(['list'], arenaPath)

        t.equal(0, result.code, 'Should return code 0')

        const lines = result.stdout.split('\n').filter((s) => s)
        t.equal(
          0,
          lines.filter((l) => l.match(/^dev-service-test_.*Up.*second/)).length,
          'Should output no services with Status "Up"'
        )
      })

      t.test('With running services', async (t) => {
        prepareArena(packageJson)
        await cli(['install'], arenaPath)
        await cli(['start'], arenaPath)

        const result = await cli(['list'], arenaPath)

        t.equal(0, result.code, 'Should return code 0')

        const lines = result.stdout.split('\n').filter((s) => s)
        t.equal(
          2,
          lines.filter((l) =>
            l.match(/^dev-service-test_(mongo|nginx).*Up.*second/)
          ).length,
          'Should output two services with Status "Up"'
        )
      })

      t.test('With irregular name in package.json', async (t) => {
        const name = '@uscreen.de/dev-service-test'
        prepareArena({ ...packageJson, name })
        await cli(['install'], arenaPath)
        await cli(['start'], arenaPath)

        const result = await cli(['list'], arenaPath)

        t.equal(0, result.code, 'Should return code 0')

        const lines = result.stdout.split('\n').filter((s) => s)
        t.equal(
          2,
          lines.filter((l) =>
            l.match(new RegExp(`^${escape(name)}_(mongo|nginx).*Up.*second`))
          ).length,
          'Should output two services with Status "Up"'
        )
      })
    }
  )
})
