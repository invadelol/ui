/** A rune page laid out as the client draws it: every rune of both trees, the chosen ones lit. */

/** Slots of each rune tree (keystones first), to show a page with the runes not taken dimmed. */
export const RUNE_SLOTS: Record<number, number[][]> = {
  8000: [[8005, 8008, 8021, 8010], [9101, 9111, 8009], [9104, 9105, 9103], [8014, 8017, 8299]],
  8100: [[8112, 8128, 9923], [8126, 8139, 8143], [8137, 8140, 8141], [8135, 8105, 8106]],
  8200: [[8214, 8229, 8230, 8992], [8224, 8226, 8275], [8210, 8234, 8233], [8237, 8232, 8236]],
  8400: [[8437, 8439, 8465], [8446, 8463, 8401], [8429, 8444, 8473], [8451, 8453, 8242]],
  8300: [[8351, 8360, 8369], [8306, 8304, 8321], [8313, 8345, 8352], [8347, 8410, 8316]],
}

/** The stat shard rows: offense, flex, defense. */
export const SHARD_ROWS: number[][] = [
  [5008, 5005, 5007],
  [5008, 5010, 5001],
  [5011, 5013, 5001],
]

export interface RuneSlot {
  id: number
  on: boolean
}

export interface RuneTreeView {
  tree: number
  /** The primary tree starts with its keystones; the secondary has its three lower rows. */
  rows: RuneSlot[][]
  /** The primary tree's first row is its keystones. */
  keystones: boolean
}

export interface RunePageView {
  primary: RuneTreeView
  secondary: RuneTreeView
  /** One row per shard slot; empty when the page has no shards. */
  shards: RuneSlot[][]
}

/**
 * The page as rows of slots. `p` and `s` start with the tree id, then the chosen runes; `m` holds
 * one shard per row. A tree missing from `trees` (`RUNE_SLOTS` by default), one added after it,
 * shows its chosen runes only, one per row, all lit.
 */
export function runePageView(page: { p: number[]; s: number[]; m: number[] }, trees: Record<number, number[][]> = RUNE_SLOTS, shards: number[][] = SHARD_ROWS): RunePageView {
  const tree = (picked: number[], primary: boolean): RuneTreeView => {
    const chosen = new Set(picked.slice(1))
    const layout = trees[picked[0]]
    if (!layout) return { tree: picked[0], rows: picked.slice(1).map((id) => [{ id, on: true }]), keystones: false }
    const rows = primary ? layout : layout.slice(1)
    return { tree: picked[0], rows: rows.map((row) => row.map((id) => ({ id, on: chosen.has(id) }))), keystones: primary }
  }
  return {
    primary: tree(page.p, true),
    secondary: tree(page.s, false),
    // A row may list the same shard twice across rows (health scaling): each row lights its own.
    shards: page.m.length ? shards.map((row, i) => row.map((id, j) => ({ id, on: page.m[i] === id && row.indexOf(id) === j }))) : [],
  }
}
