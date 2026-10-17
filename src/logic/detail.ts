/** Helpers shared by the match detail views. */
import { tk } from './i18n.js'
import type { MatchDetail, Ping, PlayerView, ScoreCategory, TeamView, TimelineView } from './types.js'

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

/** The parts of a score, in the order they are read, with their names. */
export const SCORE_PARTS: Record<ScoreCategory, string> = {
  fighting: tk('Fighting'),
  damage: tk('Damage'),
  farming: tk('Farming'),
  vision: tk('Vision'),
  objectives: tk('Objectives'),
}
export const SCORE_CATEGORIES = Object.keys(SCORE_PARTS) as ScoreCategory[]

/** Ping kinds with their in-game names. */
export const PINGS: Record<Ping, string> = {
  enemyMissing: tk('Enemy missing'),
  onMyWay: tk('On my way'),
  danger: tk('Danger'),
  assist: tk('Assist me'),
  allIn: tk('All in'),
  push: tk('Push'),
  getBack: tk('Get back'),
  command: tk('Command'),
  needVision: tk('Need vision'),
  enemyVision: tk('Enemy vision'),
  visionCleared: tk('Vision cleared'),
  bait: tk('Bait'),
  hold: tk('Hold'),
}

const SKILL_KEYS = ['Q', 'W', 'E', 'R'] as const
export type SkillKey = (typeof SKILL_KEYS)[number]

/** Q/W/E/R × 18 levels: each cell holds the level the point was spent at, else null. */
export function skillMatrix(skills: number[]): Record<SkillKey, (number | null)[]> {
  const m = Object.fromEntries(SKILL_KEYS.map((k) => [k, new Array<number | null>(18).fill(null)])) as Record<SkillKey, (number | null)[]>
  skills.slice(0, 18).forEach((slot, i) => {
    const key = SKILL_KEYS[slot - 1]
    if (key) m[key][i] = i + 1
  })
  return m
}

/** The basic skills in the order they were first taken: `['E', 'Q', 'W']`. */
export function skillPriority(skills: number[]): SkillKey[] {
  const seen: SkillKey[] = []
  for (const slot of skills) {
    const key = SKILL_KEYS[slot - 1]
    if (key && key !== 'R' && !seen.includes(key)) seen.push(key)
  }
  return seen
}

/** Gold, CS and XP leads over a player's lane opponent at a minute, when the game lasted that long. */
export function laneLead(t: TimelineView, i: number, j: number, minute: number): { minute: number; gold: number; cs: number; xp: number } | null {
  const s = minute * 60
  if (!t.t.length || t.t[t.t.length - 1] < s) return null
  // The last frame at or before the minute.
  let k = 0
  while (k + 1 < t.t.length && t.t[k + 1] <= s) k++
  return { minute, gold: t.gold[i][k] - t.gold[j][k], cs: t.cs[i][k] - t.cs[j][k], xp: t.xp[i][k] - t.xp[j][k] }
}


/**
 * Whether the role-quest slot (`roleBoundItem`) holds a real item: not empty, not a quest token
 * (12xx), not the support's ward stand-in (2055). A bot laner's finished boots move there.
 */
export const roleSlot = (id: number | undefined): id is number => !!id && !(id >= 1200 && id < 1300) && id !== 2055
