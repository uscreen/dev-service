import tap from 'tap'
import { cli } from './helpers.js'

tap.test('$ cli', async (t) => {
  const result = await cli([])
  t.equal(1, result.code, 'Should fail')

  t.equal('', result.stdout, 'Should output nothing to stdout')
  t.equal(
    true,
    result.stderr.startsWith('Usage: cli [options] [command]'),
    'Should output usage information to stderr'
  )
  t.end()
})

tap.test('$ cli noop', async (t) => {
  const result = await cli(['noop'])
  t.equal(1, result.code, 'Should fail')
  t.equal('', result.stdout, 'Should output nothing to stdout')
  t.equal(
    true,
    result.stderr.startsWith(
      "error: unknown command 'noop'. See 'cli --help'."
    ),
    'Should output error to stderr'
  )
  t.end()
})
