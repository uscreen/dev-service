import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { cli } from './helpers.js'

describe('$ service status', () => {
  test('Shows detected tools', async () => {
    const result = await cli(['status'])
    assert.equal(result.code, 0, 'Should succeed')
    assert.ok(result.stdout.includes('docker'), 'Should mention docker')
    assert.ok(result.stdout.includes('docker compose'), 'Should mention docker compose')
    assert.ok(result.stdout.includes('docker-compose'), 'Should mention docker-compose')
  })
})
