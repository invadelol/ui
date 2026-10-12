import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextPage, pager, PAGE_BURST, PAGE_EVERY_MS } from '../src/logic/pager.ts'

const MIN = 60_000

test('three pages right away, then one every two minutes', () => {
  let now = 1_000_000
  const p = pager(() => now)
  for (let i = 0; i < PAGE_BURST; i++) {
    assert.equal(p.wait(), 0, `page ${i + 1} is free`)
    p.take()
  }
  assert.equal(p.wait(), 2 * MIN)
  now += 42_000
  assert.equal(p.wait(), 78_000, 'the countdown runs')
  now += 78_000
  assert.equal(p.wait(), 0)
  p.take()
  assert.equal(p.wait(), 2 * MIN, 'one page, then the next two minutes later')
})

test('an idle view earns its pages back at the same rate', () => {
  let now = 0
  const p = pager(() => now)
  for (let i = 0; i < 3; i++) p.take()
  now += 2 * PAGE_EVERY_MS
  p.take()
  p.take()
  assert.equal(p.wait(), PAGE_EVERY_MS, 'two earned, both spent')
  now += 10 * PAGE_EVERY_MS
  for (let i = 0; i < PAGE_BURST; i++) {
    assert.equal(p.wait(), 0)
    p.take()
  }
  assert.ok(p.wait() > 0, 'never more than the burst')
})

test("a source's own wait holds the next page as long", () => {
  let now = 5_000
  const p = pager(() => now)
  p.hold(90_000)
  assert.equal(p.wait(), 90_000)
  now += 90_000
  assert.equal(p.wait(), 0)
  p.take()
  assert.equal(p.wait(), PAGE_EVERY_MS, 'then the usual pace')
})

test('nextPage leaves the state alone when refused (as the server applies it)', () => {
  let tat = 0
  for (let i = 0; i < PAGE_BURST; i++) {
    const r = nextPage(tat, 0)
    assert.equal(r.wait, 0)
    tat = r.tat
  }
  assert.deepEqual(nextPage(tat, 0), { wait: PAGE_EVERY_MS, tat })
  assert.deepEqual(nextPage(tat, PAGE_EVERY_MS), { wait: 0, tat: tat + PAGE_EVERY_MS })
})
