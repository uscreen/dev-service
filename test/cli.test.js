import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cli } from './helpers.js'

test('$ cli', async (t) => {
  const result = await cli([])
  assert.equal(result.code, 1, 'Should fail')

  assert.equal(result.stdout, '', 'Should output nothing to stdout')
  assert.equal(
    result.stderr.startsWith('Usage: cli [options] [command]'),
    true,
    'Should output usage information to stderr'
  )
})

test('$ cli noop', async (t) => {
  const result = await cli(['noop'])
  assert.equal(result.code, 1, 'Should fail')
  assert.equal(result.stdout, '', 'Should output nothing to stdout')
  assert.equal(
    result.stderr.startsWith("error: unknown command 'noop'"),
    true,
    'Should output error to stderr'
  )
})
