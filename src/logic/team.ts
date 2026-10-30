/**
 * How the player's four teammates played in a game, in five steps from a great team to a poor one.
 * Both products read it from the same figures, the teammates' Invade scores (`ScoreRow.mates`), so
 * a game gets the same label in the app and on invade.lol.
 *
 * Teammates of a winning team always post better figures than those of a losing one: compared as
 * they are, the label would only repeat the result. So a team is read against teams with the same
 * result in the same mode: a "Good team" in a loss played better than most losing teams, a "Bad
 * team" in a win is one the player won with. The player's own score is left out.
 *
 * Each score goes back to its scale (`x` in `100 / (1 + e^-(x − 0.35))`), the four are averaged and
 * compared with the usual average for that result, in units of how much it varies
 * ([`USUAL`], measured on 676,000 player-games of ranked and normal queues and ARAM, October 2026).
 * From ±0.52 a team is good or bad, from ±1.28 great or poor: one game in ten at each end, two in
 * ten next to them, four in ten average. A teammate who was AFK (no score) makes a poor team.
 */
import { tk } from './i18n.js'
import type { MatchDetail, MatchSummary, ScoreRow } from './types.js'

export type TeamRating = 'great' | 'good' | 'average' | 'bad' | 'poor'

export interface TeamVerdict {
  rating: TeamRating
  /** A teammate was AFK: the rating is `poor` whatever the others did. */
  afk: boolean
}

/** Teammates' mean on the score's scale for a win and a loss: [mean, spread]. Summoner's Rift, then other maps. */
const USUAL = {
  rift: { win: [0.58, 0.35], loss: [-0.72, 0.39] },
  roleless: { win: [0.5, 0.38], loss: [-0.5, 0.38] },
} as const

const GOOD = 0.52
const GREAT = 1.28
const CENTRE = 0.35

/** A score 0‥100 back on its scale; whole points, as both products show them. */
const scale = (score: number) => CENTRE - Math.log(100 / Math.min(99.5, Math.max(0.5, Math.round(score))) - 1)

/**
 * The verdict on the four teammates of a game: `null` when it cannot be read (a remake, a game
 * without scores, a mode without five-player teams). `mates`: their scores 0‥10 as `ScoreRow`
 * carries them, `null` for an AFK one.
 */
export function teamRating(game: Pick<MatchSummary, 'win' | 'remake' | 'mapId'>, mates: readonly (number | null)[] | null | undefined): TeamVerdict | null {
  if (game.remake || mates?.length !== 4) return null
  if (mates.some((s) => s === null)) return { rating: 'poor', afk: true }
  const mean = mates.reduce<number>((n, s) => n + scale((s as number) * 10), 0) / 4
  const [usual, spread] = USUAL[game.mapId === 11 ? 'rift' : 'roleless'][game.win ? 'win' : 'loss']
  const z = (mean - usual) / spread
  const rating: TeamRating = z >= GREAT ? 'great' : z >= GOOD ? 'good' : z > -GOOD ? 'average' : z > -GREAT ? 'bad' : 'poor'
  return { rating, afk: false }
}

/** The verdict of a match row: its score row's teammates. */
export const rowTeamRating = (game: MatchSummary, score: ScoreRow | null | undefined) => teamRating(game, score?.mates)

/** The verdict on the teammates of `puuid` in an opened game; `null` when they have no score. */
export function detailTeamRating(d: MatchDetail, puuid: string): TeamVerdict | null {
  const p = d.players.find((x) => x.puuid === puuid)
  if (!p || p.score === null) return null
  const mates = d.players.filter((x) => x.teamId === p.teamId && x !== p).map((x) => x.score)
  return teamRating({ win: p.win, remake: d.remake, mapId: d.mapId }, mates)
}

/** Labels, and what each says for a win and a loss. */
export const TEAM_RATINGS: Record<TeamRating, { label: string; win: string; loss: string }> = {
  great: {
    label: tk('Great team'),
    win: tk('Your teammates played far better than most winning teams.'),
    loss: tk('Your teammates played far better than most losing teams.'),
  },
  good: {
    label: tk('Good team'),
    win: tk('Your teammates played better than most winning teams.'),
    loss: tk('Your teammates held up better than most losing teams.'),
  },
  average: {
    label: tk('Average team'),
    win: tk('Your teammates played like a usual winning team.'),
    loss: tk('Your teammates played like a usual losing team.'),
  },
  bad: {
    label: tk('Bad team'),
    win: tk('You won with teammates below most winning teams.'),
    loss: tk('Your teammates played worse than most losing teams.'),
  },
  poor: {
    label: tk('Poor team'),
    win: tk('You won with teammates far below most winning teams.'),
    loss: tk('Your teammates played far worse than most losing teams.'),
  },
}

/** Tooltip line for an AFK teammate, and the line under every tooltip. */
export const TEAM_AFK = tk('A teammate was AFK for much of the game.')
export const TEAM_BASIS = tk('From your four teammates’ Invade scores, against games with the same result.')

/** The tooltip of a verdict: what it says, then what it is read from. */
export function teamTip(v: TeamVerdict, win: boolean, t: (key: string) => string): string {
  const line = v.afk ? TEAM_AFK : TEAM_RATINGS[v.rating][win ? 'win' : 'loss']
  return `${t(line)}\n${t(TEAM_BASIS)}`
}
