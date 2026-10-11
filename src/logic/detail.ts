/** Helpers shared by the match detail views. */
import type { MatchDetail, PlayerView, TeamView } from './types'

/**
 * Colours are relative to the viewed player: them in brand, their team in the "good for you"
 * blue, the other team in red. Sides stay names ("Blue side"), never colours.
 */
export function lineColor(p: PlayerView, me: PlayerView | undefined): string {
  if (me && p.participantId === me.participantId) return 'var(--brand)'
  return !me || p.teamId === me.teamId ? 'var(--win)' : 'var(--loss)'
}

/** `ally` / `enemy` of a team or player, from the viewed player's side. */
export const relation = (teamId: number, me: PlayerView | undefined) => (!me || teamId === me.teamId ? 'ally' : 'enemy')

/** Side name of a team (Arena duos have none). */
export const side = (teamId: number) => (teamId === 100 ? 'blue' : teamId === 200 ? 'red' : '')

export const riotId = (p: Pick<PlayerView, 'gameName' | 'tagLine'>) => (p.gameName ? `${p.gameName}#${p.tagLine}` : '')

/** Teams with their players, the viewed player's team first (Arena: by placement). */
export function teamsOf(d: MatchDetail, me: PlayerView | undefined): { team: TeamView; players: PlayerView[]; placement: number }[] {
  const list = d.teams.map((team) => {
    const players = d.players.filter((p) => p.teamId === team.teamId)
    return { team, players, placement: players[0]?.placement ?? 0 }
  })
  return list.sort((a, b) => {
    if (me) {
      if (a.team.teamId === me.teamId) return -1
      if (b.team.teamId === me.teamId) return 1
    }
    return a.placement && b.placement ? a.placement - b.placement : a.team.teamId - b.team.teamId
  })
}

/** Slots of each rune tree (keystones first), to show a page with the runes not taken dimmed. */
export const RUNE_SLOTS: Record<number, number[][]> = {
  8000: [[8005, 8008, 8021, 8010], [9101, 9111, 8009], [9104, 9105, 9103], [8014, 8017, 8299]],
  8100: [[8112, 8128, 9923], [8126, 8139, 8143], [8137, 8140, 8141], [8135, 8105, 8106]],
  8200: [[8214, 8229, 8230, 8992], [8224, 8226, 8275], [8210, 8234, 8233], [8237, 8232, 8236]],
  8400: [[8437, 8439, 8465], [8446, 8463, 8401], [8429, 8444, 8473], [8451, 8453, 8242]],
  8300: [[8351, 8360, 8369], [8306, 8304, 8321], [8313, 8345, 8352], [8347, 8410, 8316]],
}

/** Whether the timeline carries any event to tell (stored games from before events were kept do not). */
export const hasEvents = (d: MatchDetail) => !!d.timeline && (d.timeline.kills.length > 0 || d.timeline.objectives.length > 0)
