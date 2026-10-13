import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { effectScope, nextTick, shallowRef } from 'vue'
import { sameKey, useDelayedFlag, useStableData } from '../src/stable.ts'

/** A promise to settle by hand. */
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((a, b) => ((resolve = a), (reject = b)))
  return { promise, resolve, reject }
}
const flush = async () => {
  for (let i = 0; i < 4; i++) await nextTick()
}

test('the shown data stays until the next answer arrives, then swaps in one go', async () => {
  const filter = shallowRef('all')
  const answers = new Map<string, ReturnType<typeof deferred<string[]>>>()
  const scope = effectScope()
  const s = scope.run(() =>
    useStableData(filter, (q) => {
      const d = deferred<string[]>()
      answers.set(q, d)
      return d.promise
    }),
  )!
  assert.equal(s.ready.value, false, 'nothing to show before the first answer')
  answers.get('all')!.resolve(['a', 'b', 'c'])
  await flush()
  assert.deepEqual(s.data.value, ['a', 'b', 'c'])
  assert.equal(s.key.value, 'all')

  filter.value = 'flex'
  await flush()
  assert.equal(s.pending.value, true)
  assert.deepEqual(s.data.value, ['a', 'b', 'c'], 'no empty frame while the next one loads')
  assert.equal(s.key.value, 'all', 'labels drawn from the key still match the data')

  answers.get('flex')!.resolve(['b'])
  await flush()
  assert.deepEqual(s.data.value, ['b'])
  assert.equal(s.key.value, 'flex')
  assert.equal(s.pending.value, false)
  scope.stop()
})

test('the latest key wins: a slower answer for an older key is dropped', async () => {
  const filter = shallowRef(1)
  const answers = new Map<number, ReturnType<typeof deferred<string>>>()
  const scope = effectScope()
  const s = scope.run(() =>
    useStableData(filter, (n) => {
      const d = deferred<string>()
      answers.set(n, d)
      return d.promise
    }),
  )!
  answers.get(1)!.resolve('one')
  await flush()
  filter.value = 2
  await flush()
  filter.value = 3
  await flush()
  answers.get(3)!.resolve('three')
  await flush()
  answers.get(2)!.resolve('two')
  await flush()
  assert.equal(s.data.value, 'three')
  assert.equal(s.key.value, 3)
  scope.stop()
})

test('an answer given at once swaps in the same tick, with no pending state', async () => {
  const filter = shallowRef('solo')
  const scope = effectScope()
  const s = scope.run(() => useStableData(filter, (q) => `rows of ${q}`))!
  assert.equal(s.data.value, 'rows of solo', 'set during setup')
  filter.value = 'flex'
  await nextTick()
  assert.equal(s.data.value, 'rows of flex')
  assert.equal(s.pending.value, false)
  scope.stop()
})

test('busy turns on only when an answer is slow, and off when it lands', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const filter = shallowRef('a')
    let next = deferred<string>()
    const scope = effectScope()
    const s = scope.run(() => useStableData(filter, () => next.promise, { delay: 200 }))!
    next.resolve('A')
    await flush()

    // Fast: answered within the delay, never busy.
    next = deferred()
    filter.value = 'b'
    await flush()
    mock.timers.tick(150)
    assert.equal(s.busy.value, false)
    next.resolve('B')
    await flush()
    mock.timers.tick(100)
    assert.equal(s.busy.value, false, 'a fast answer shows no hint at all')

    // Slow: busy after the delay, while the last data stays.
    next = deferred()
    filter.value = 'c'
    await flush()
    mock.timers.tick(199)
    assert.equal(s.busy.value, false)
    mock.timers.tick(1)
    assert.equal(s.busy.value, true)
    assert.equal(s.data.value, 'B')
    next.resolve('C')
    await flush()
    assert.equal(s.busy.value, false)
    assert.equal(s.data.value, 'C')
    scope.stop()
  } finally {
    mock.timers.reset()
  }
})

test('switching again while waiting does not restart the delay', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const filter = shallowRef(0)
    const scope = effectScope()
    const s = scope.run(() => useStableData(filter, (n) => (n === 0 ? 'zero' : new Promise<string>(() => {})), { delay: 200 }))!
    filter.value = 1
    await flush()
    mock.timers.tick(120)
    filter.value = 2
    await flush()
    mock.timers.tick(80)
    assert.equal(s.busy.value, true, 'the wait counts from the first switch')
    scope.stop()
  } finally {
    mock.timers.reset()
  }
})

test('a failure keeps the last data and says so; the next success clears it', async () => {
  const filter = shallowRef('gold')
  const scope = effectScope()
  const s = scope.run(() => useStableData(filter, (r) => (r === 'broken' ? Promise.reject(new Error('404')) : Promise.resolve(`file ${r}`))))!
  await flush()
  filter.value = 'broken'
  await flush()
  assert.equal(s.data.value, 'file gold')
  assert.ok(s.error.value instanceof Error)
  assert.equal(s.pending.value, false)
  filter.value = 'emerald'
  await flush()
  assert.equal(s.data.value, 'file emerald')
  assert.equal(s.error.value, undefined)
  scope.stop()
})

test('the same key is not loaded twice; reload asks again', async () => {
  const filter = shallowRef<[string, number]>(['MID', 31])
  let calls = 0
  const scope = effectScope()
  const s = scope.run(() => useStableData(filter, () => ++calls))!
  filter.value = ['MID', 31]
  await flush()
  assert.equal(calls, 1, 'an equal key loads nothing')
  filter.value = ['TOP', 31]
  await flush()
  assert.equal(calls, 2)
  await s.reload()
  assert.equal(calls, 3)
  scope.stop()
})

test('keys compare by value', () => {
  assert.ok(sameKey(['a', 1, null], ['a', 1, null]))
  assert.ok(sameKey({ lane: 'MID', minute: 30 }, { lane: 'MID', minute: 30 }))
  assert.ok(!sameKey(['a', 1], ['a', 2]))
  assert.ok(!sameKey({ a: 1 }, { a: 1, b: 2 }))
  const list = [1, 2]
  assert.ok(sameKey([list], [list]), 'the same list')
  assert.ok(!sameKey([[1, 2]], [[1, 2]]), 'two lists that happen to be equal are two answers')
})

test('a delayed flag ignores what ends before the delay', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const on = shallowRef(false)
    const scope = effectScope()
    const flag = scope.run(() => useDelayedFlag(on, 200))!
    on.value = true
    mock.timers.tick(199)
    on.value = false
    mock.timers.tick(500)
    assert.equal(flag.value, false)
    on.value = true
    mock.timers.tick(200)
    assert.equal(flag.value, true)
    on.value = false
    assert.equal(flag.value, false, 'off at once')
    scope.stop()
  } finally {
    mock.timers.reset()
  }
})
