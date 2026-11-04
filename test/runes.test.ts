import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RUNE_SLOTS, runePageView } from '../src/logic/runes.ts'

const lit = (rows: { id: number; on: boolean }[][]) => rows.flat().filter((r) => r.on).map((r) => r.id)

test('both trees in full, the chosen runes lit', () => {
  const v = runePageView({ p: [8300, 8369, 8304, 8345, 8347], s: [8200, 8226, 8210], m: [5008, 5008, 5001] })
  assert.equal(v.primary.tree, 8300)
  assert.equal(v.primary.keystones, true)
  assert.equal(v.primary.rows.length, 4, 'keystones, then three rows')
  assert.deepEqual(v.primary.rows[0].map((r) => r.id), RUNE_SLOTS[8300][0])
  assert.deepEqual(lit(v.primary.rows), [8369, 8304, 8345, 8347])
  assert.equal(v.secondary.keystones, false)
  assert.equal(v.secondary.rows.length, 3, 'the secondary tree has no keystone row')
  assert.deepEqual(lit(v.secondary.rows), [8226, 8210])
})

test('each shard row lights its own shard, even one listed in two rows', () => {
  const v = runePageView({ p: [8000, 8010, 9111, 9104, 8299], s: [8400, 8444, 8242], m: [5008, 5008, 5001] })
  assert.deepEqual(v.shards.map((row) => row.filter((r) => r.on).map((r) => r.id)), [[5008], [5008], [5001]])
  assert.equal(v.shards[2].filter((r) => r.on).length, 1)
})

test('a tree the layout does not know shows its chosen runes only, all lit', () => {
  const v = runePageView({ p: [9900, 1, 2, 3, 4], s: [8200, 8226, 8210], m: [] })
  assert.deepEqual(v.primary.rows, [[{ id: 1, on: true }], [{ id: 2, on: true }], [{ id: 3, on: true }], [{ id: 4, on: true }]])
  assert.deepEqual(v.shards, [], 'no shards, no rows')
})

test('a host layout replaces the bundled one', () => {
  const v = runePageView({ p: [8000, 8010, 9111, 9104, 8299], s: [8400, 8444, 8242], m: [] }, { ...RUNE_SLOTS, 8000: [[8010, 8005], [9111], [9104], [8299]] })
  assert.deepEqual(v.primary.rows.map((r) => r.map((x) => x.id)), [[8010, 8005], [9111], [9104], [8299]])
})
