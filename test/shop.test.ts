import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shopVisits } from '../src/logic/shop.ts'

test('purchases group into visits, same items stacked, sold last', () => {
  const visits = shopVisits([
    { t: 0, item: 1055, sold: false },
    { t: 1, item: 2003, sold: false },
    { t: 2, item: 2003, sold: false },
    { t: 300, item: 1055, sold: true },
    { t: 301, item: 1036, sold: false },
    { t: 400, item: 3006, sold: false },
  ])
  assert.deepEqual(
    visits.map((v) => [v.t, v.items.map((x) => `${x.item}${x.sold ? 's' : ''}×${x.count}`)]),
    [
      [0, ['1055×1', '2003×2']],
      [300, ['1036×1', '1055s×1']],
      [400, ['3006×1']],
    ]
  )
})
