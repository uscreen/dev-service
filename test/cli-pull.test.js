import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import fs from 'fs-extra'

import {
  arenaPath,
  clearArena,
  cli,
  composePath,
  prepareArena
} from './helpers.js'

const packageJson = {
  name: 'dev-service-test',
  services: ['mongo:latest', 'nginx']
}

describe('$ cli pull', () => {
  afterEach(async () => {
    await clearArena()
  })

  test('Within a folder with no .compose subfolder', async () => {
    prepareArena(packageJson)

    const result = await cli(['pull'], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('Within a folder with empty .compose subfolder', async () => {
    prepareArena(packageJson)
    fs.ensureDirSync(composePath)

    const result = await cli(['pull'], arenaPath)

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('If no docker host is available', async () => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['pull'], arenaPath, {
      DOCKER_HOST: 'tcp://notexisting:2376'
    })

    assert.notEqual(result.code, 0, 'Should return code != 0')
    assert.equal(
      result.stderr.includes('ERROR'),
      true,
      'Should output error message'
    )
  })

  test('If services are defined in .compose subfolder', async () => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['pull'], arenaPath)

    assert.equal(result.code, 0, 'Should return code 0')

    const lines = result.stderr.split('\n').filter(s => s)
    for (const s of ['nginx', 'mongo']) {
      assert.ok(
        lines.some(l => l.match(new RegExp(`${s} pulled`, 'i'))),
        `Should pull ${s} image`
      )
    }
  })
})
