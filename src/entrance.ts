/**
 * Entrance motion plays once per view. The first dials a view shows draw in together; dials that
 * appear later in the same view (a filter showing other rows, an older page appended, a score
 * arriving late) are simply there, so changing a filter never replays the page's entrance. A view
 * ends when none of its dials is left (the host moved to another page): the next one draws in.
 * Server rendering draws in (it is the first paint), and hydration agrees with it.
 */
import { onBeforeUnmount, onMounted } from 'vue'

/** How long after a view's first dial others still join its entrance (ms). */
const WINDOW = 900
let alive = 0
let fresh = true
let until = 0

/** Counts this dial in the view (call from a dial's setup). */
export function joinView() {
  onMounted(() => void alive++)
  onBeforeUnmount(() => {
    if (--alive <= 0) {
      alive = 0
      fresh = true
    }
  })
}

/** Whether a dial appearing now draws in: the view's first ones do, later ones do not. */
export function drawsIn(): boolean {
  if (typeof window === 'undefined') return true
  const now = performance.now()
  if (fresh) {
    fresh = false
    until = now + WINDOW
  }
  return now <= until
}
