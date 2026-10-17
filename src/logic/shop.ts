/** A player's purchases as the build path reads them. */
import type { Purchase } from './types.js'

/** Seconds between two shop actions of one visit (a back, or the fountain at the start). */
const VISIT_GAP = 45

/** One visit to the shop: what was bought and sold, same items stacked. */
export interface ShopVisit {
  /** Seconds into the game of its first action. */
  t: number
  items: { item: number; sold: boolean; count: number; t: number }[]
}

/**
 * A player's purchases as visits to the shop, in order. Actions closer than `VISIT_GAP` share a
 * visit; inside one, the same item bought (or sold) again is counted, not repeated.
 */
export function shopVisits(purchases: Purchase[]): ShopVisit[] {
  const out: ShopVisit[] = []
  let last = -Infinity
  for (const p of [...purchases].sort((a, b) => a.t - b.t)) {
    if (p.t - last > VISIT_GAP || !out.length) out.push({ t: p.t, items: [] })
    last = p.t
    const visit = out[out.length - 1]
    const same = visit.items.find((x) => x.item === p.item && x.sold === p.sold)
    if (same) same.count++
    else visit.items.push({ item: p.item, sold: p.sold, count: 1, t: p.t })
  }
  // Sold items close their visit, after what was bought.
  for (const v of out) v.items.sort((a, b) => Number(a.sold) - Number(b.sold))
  return out
}
