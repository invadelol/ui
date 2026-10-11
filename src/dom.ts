/** Hides an image the asset source doesn't have (removed items, mode-only spells). */
export function hideBroken(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
