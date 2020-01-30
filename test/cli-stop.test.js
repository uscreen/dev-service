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

tap.test('$ cli stop', async t => {
  t.afterEach(clearArena)
  t.test('Within folder with no .compose folder', async t => {
    prepareArena(packageJson)

    const result = await cli(['stop'], arenaPath)

    t.strictEqual(1, result.code, 'Should return code 1')
    t.strictEqual(
      true,
      result.stderr.includes('ERROR'),
      'Should output error message'
    )
  })

  t.test(
    'Within folder with .compose folder not containing any service definitions',
    async t => {
      prepareArena(packageJson)
      fs.ensureDirSync(composePath)

      const result = await cli(['stop'], arenaPath)

      t.strictEqual(1, result.code, 'Should return code 1')
      t.strictEqual(
        true,
        result.stderr.includes('ERROR'),
        'Should output error message'
      )
    }
  )

  t.test(
    'Within folder with two defined services in .compose folder',
    async t => {
      prepareArena(packageJson)
      await cli(['install'], arenaPath)
      await cli(['start'], arenaPath)

      const result = await cli(['stop'], arenaPath)

      t.strictEqual(0, result.code, 'Should return code 0')

      t.test('Checking running containers', async t => {
        const cresult = await compose('ps', '-q')
        t.strictEqual(0, cresult.code, 'Should return code 0')

        // Checking number of running containers (identified by 64-digit ids):
        const lines = cresult.stdout.split('\n').filter(s => s)

        t.strictEqual(0, lines.length, 'Should return zero lines')
      })
    }
  )
})
