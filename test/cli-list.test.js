import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
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

describe('$ cli list', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['list'], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('Within a folder with empty .compose subfolder', async (t) => {
    prepareArena(packageJson)
    fs.ensureDirSync(composePath)

    const result = await cli(['list'], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  describe('Within a folder with two defined services in .compose subfolder', () => {
    test('If no docker host is available', async (t) => {
      prepareArena(packageJson)
      await cli(['install'], arenaPath)

      const result = await cli(['list'], arenaPath, {
        DOCKER_HOST: 'tcp://notexisting:2376'
      })

      assert.notEqual(result.code, 0, 'Should return code != 0')
      assert.equal(
        result.stderr.includes('ERROR'),
        true,
        'Should output error message'
      )
    })

    test('With no running services', async (t) => {
      prepareArena(packageJson)
      await cli(['install'], arenaPath)

      const result = await cli(['list'], arenaPath)

      assert.equal(result.code, 0, 'Should return code 0')

      const lines = result.stdout.split('\n').filter((s) => s)
      assert.equal(
        lines.filter((l) => l.match(/^dev-service-test_.*Up.*second/)).length,
        0,
        'Should output no services with Status "Up"'
      )
    })

    test('With running services', async (t) => {
      prepareArena(packageJson)
      await cli(['install'], arenaPath)
      await cli(['start'], arenaPath)

      const result = await cli(['list'], arenaPath)

      assert.equal(result.code, 0, 'Should return code 0')

      const lines = result.stdout.split('\n').filter((s) => s)
      assert.equal(
        lines.filter((l) =>
          l.match(/^dev-service-test_(mongo|nginx).*Up.*second/)
        ).length,
        2,
        'Should output two services with Status "Up"'
      )
    })

    test('With irregular name in package.json', async (t) => {
      const name = '@uscreen.de/dev-service-test'
      prepareArena({ ...packageJson, name })
      await cli(['install'], arenaPath)
      await cli(['start'], arenaPath)

      const result = await cli(['list'], arenaPath)

      assert.equal(result.code, 0, 'Should return code 0')

      const lines = result.stdout.split('\n').filter((s) => s)
      assert.equal(
        lines.filter((l) =>
          l.match(new RegExp(`^${escape(name)}_(mongo|nginx).*Up.*second`))
        ).length,
        2,
        'Should output two services with Status "Up"'
      )
    })
  })
})
