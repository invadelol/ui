/** LP won or lost per ranked game, matched from LP snapshots (the desktop app records them for own accounts). */
import type { LpPoint, MatchSummary } from './types'

const QUEUES = { solo: 420, flex: 440 } as const

/**
 * A pair of consecutive snapshots of one queue gives a game its LP change only when it cannot be
 * anything else: exactly one game was played between them (wins + losses grew by one, with the
 * game's result), and exactly one loaded game of that queue started after the first snapshot and
 * ended before the second. Anything ambiguous (several games per snapshot, dodges, decay, season
 * resets) is left out rather than guessed.
 */
export function lpByGame(points: readonly LpPoint[], games: readonly MatchSummary[]): Map<number, number> {
  const out = new Map<number, number>()
  if (!points.length) return out
  for (const [queue, id] of Object.entries(QUEUES)) {
    const pts = points.filter((p) => p.queue === queue)
    const list = games.filter((g) => g.queueId === id && !g.remake)
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const won = b.wins - a.wins
      const lost = b.losses - a.losses
      if (won < 0 || lost < 0 || won + lost !== 1) continue
      const inside = list.filter((g) => g.creation > a.t && g.creation + g.duration * 1000 <= b.t)
      if (inside.length !== 1 || inside[0].win !== (won === 1)) continue
      out.set(inside[0].gameId, Math.round(b.value - a.value))
    }
  }
  return out
}
