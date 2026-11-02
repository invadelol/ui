/** Hides an image the asset source doesn't have (removed items, mode-only spells). */
export function hideBroken(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}

/**
 * Runs `fn` once the next frame has painted. A tap that opens something heavy (a chart, a
 * scoreboard) shows its own answer first (the pressed tab, the opened row) and the heavy part
 * draws in the frame after, so the tap never waits on it.
 */
export function afterPaint(fn: () => void) {
  if (typeof requestAnimationFrame === 'undefined') return fn()
  requestAnimationFrame(() => setTimeout(fn, 0))
}
