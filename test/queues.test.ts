import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'

// The library uses .js specifiers for consumers of its declarations; run its TS sources directly.
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes('/src/logic/') && specifier.startsWith('./') && specifier.endsWith('.js')) {
      return next(specifier.replace(/\.js$/, '.ts'), context)
    }
    return next(specifier, context)
  },
})
const { queueName, queueShort, UNKNOWN_QUEUE } = await import('../src/logic/labels.ts')

test('current and retired ranked 5v5 queues keep their identity', () => {
  for (const [id, label] of [
    [4, 'Ranked Solo/Duo'], [6, 'Ranked Premade'], [42, 'Ranked Team'],
    [410, 'Ranked Dynamic'], [420, 'Ranked Solo/Duo'], [440, 'Ranked Flex'],
  ] as const) {
    assert.equal(queueName(id), label)
    assert.notEqual(queueShort(id), 'Custom')
  }
})

test('unknown metadata and new queues never claim to be custom games', () => {
  for (const id of [UNKNOWN_QUEUE, -1, 9999, NaN]) {
    assert.equal(queueName(id), 'Unknown queue')
    assert.equal(queueShort(id), 'Unknown queue')
  }
  assert.equal(queueName(0), 'Custom')
  assert.equal(queueName(3140), 'Practice Tool')
  assert.equal(queueName(UNKNOWN_QUEUE, (key) => key === 'Unknown queue' ? 'File inconnue' : key), 'File inconnue')
})
