const tap = require('tap')
const { cli } = require('./helpers')

tap.test('$ cli', async t => {
  const result = await cli([])
  t.strictEqual(0, result.code, 'Should succeed')
  t.strictEqual(
    true,
    result.stdout.startsWith('Usage: cli [options] [command]'),
    'Should print usage information'
  )
  t.end()
})

tap.test('$ cli noop', async t => {
  const result = await cli(['noop'])
  t.strictEqual(0, result.code, 'Should succeed')
  t.strictEqual('', result.stdout, 'Should print empty string')
  t.end()
})
