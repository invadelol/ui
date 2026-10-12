import assert from 'node:assert/strict'
import { test } from 'node:test'
import { endOfList, PAGE_SIZE } from '../src/logic/pager.ts'

test('pages of fifteen', () => {
  assert.equal(PAGE_SIZE, 15)
})

test('stored pages are never paced: every reach of the end asks', () => {
  const now = 1_000_000
  const end = endOfList(() => now)
  for (let i = 0; i < 50; i++) {
    assert.equal(end.ask(), true, `page ${i + 1} loads right away`)
    end.clear()
  }
  assert.equal(end.held(), false)
})

test('a held page ends the list quietly, then a later reach after the window asks once more', () => {
  let now = 5_000
  const end = endOfList(() => now)
  end.hold(120_000)
  assert.equal(end.held(), true, 'the list ends here for now')
  assert.equal(end.ask(), false, 'reaching the end again too soon asks nothing')
  now += 119_999
  assert.equal(end.ask(), false)
  now += 1
  assert.equal(end.ask(), true, 'after the window, the next reach asks')
  end.hold(30_000)
  assert.equal(end.ask(), false, 'held again: quiet again')
  now += 30_000
  assert.equal(end.ask(), true)
  end.clear()
  assert.equal(end.held(), false, 'a page loaded: free again')
})

test('a hold without a window asks on the next reach', () => {
  const end = endOfList(() => 0)
  end.hold(-5)
  assert.equal(end.held(), true)
  assert.equal(end.ask(), true)
})
