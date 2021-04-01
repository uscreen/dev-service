const tap = require('tap')
const fs = require('fs-extra')
const http = require('http')

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

const service = 'nginx'

tap.test('$ cli logs [service]', async (t) => {
  t.afterEach(clearArena)

  t.test('Within a folder with no .compose subfolder', async (t) => {
    prepareArena(packageJson)

    const result = await cli(['logs', service], arenaPath)

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

    const result = await cli(['logs', service], arenaPath)

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

    const result = await cli(['logs', service], arenaPath, {
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
    await cli(['start'], arenaPath)

    const otherService = 'nats'
    const result = await cli(['logs', otherService], arenaPath, {}, 2000)

    t.notEqual(0, result.code, 'Should return code != 0')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test('With no running [service]', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)

    const result = await cli(['logs', service], arenaPath, {}, 2000)

    t.strictEqual(0, result.code, 'Should return code 0')

    const lines = result.stdout
      .split('\n')
      .filter((s) => s)
      .filter((l) => !l.match(/^Attaching to */))

    t.strictEqual(0, lines.length, 'Should show no logs')
  })

  t.test('With running [service]', async (t) => {
    prepareArena(packageJson)
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    // send request 1s from now:
    setTimeout(() => {
      http.get('http://localhost')
    }, 1000)

    // record logs for the next 2s:
    const result = await cli(['logs', service], arenaPath, {}, 2000)

    t.strictEqual(0, result.code, 'Should return code 0')

    const lines = result.stdout
      .split('\n')
      .filter((s) => s)
      .filter((l) => !l.match(/^Attaching to */))

    t.strictEqual(true, lines.length > 0, 'Should show logs')

    t.strictEqual(
      true,
      lines.filter((l) => l.match(/nginx.*GET \/.*200/)).length > 0,
      'Should show request sent to nginx service in logs'
    )
  })

  t.test('With irregular name in package.json', async (t) => {
    const name = '@uscreen.de/dev-service-test'
    prepareArena({ ...packageJson, name })
    await cli(['install'], arenaPath)
    await cli(['start'], arenaPath)

    // send request 1s from now:
    setTimeout(() => {
      http.get('http://localhost')
    }, 1000)

    // record logs for the next 2s:
    const result = await cli(['logs', service], arenaPath, {}, 2000)

    t.strictEqual(0, result.code, 'Should return code 0')

    const lines = result.stdout
      .split('\n')
      .filter((s) => s)
      .filter((l) => !l.match(/^Attaching to */))

    t.strictEqual(true, lines.length > 0, 'Should show logs')

    t.strictEqual(
      true,
      lines.filter((l) => l.match(/nginx.*GET \/.*200/)).length > 0,
      'Should show request sent to nginx service in logs'
    )
  })
})
