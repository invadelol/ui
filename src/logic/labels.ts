/** Names of things: ranks, queues, positions, badges and counted nouns. Each takes the host's `t`. */
import { english, tk, type Translate } from './i18n.js'
import type { Badge, Position, Rank, Totals } from './types.js'

export const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'] as const
const TIER_NAMES: Record<string, string> = {
  IRON: tk('Iron'),
  BRONZE: tk('Bronze'),
  SILVER: tk('Silver'),
  GOLD: tk('Gold'),
  PLATINUM: tk('Platinum'),
  EMERALD: tk('Emerald'),
  DIAMOND: tk('Diamond'),
  MASTER: tk('Master'),
  GRANDMASTER: tk('Grandmaster'),
  CHALLENGER: tk('Challenger'),
}

/** "Gold II · 45 LP", "Master · 120 LP", "Unranked". */
export function rankLabel(r: Pick<Rank, 'tier' | 'division' | 'lp'> | null | undefined, withLp = true, t: Translate = english): string {
  if (!r) return t('Unranked')
  const name = `${t(TIER_NAMES[r.tier] ?? r.tier)}${r.division ? ` ${r.division}` : ''}`
  return withLp ? `${name} · ${r.lp} ${t('LP')}` : name
}

/** Short form for tight spaces: "G2", "M", "E4". */
export function rankShort(r: Pick<Rank, 'tier' | 'division'> | null | undefined): string {
  if (!r) return '–'
  const letter = r.tier === 'GRANDMASTER' ? 'GM' : r.tier === 'CHALLENGER' ? 'C' : r.tier[0]
  const div = { I: '1', II: '2', III: '3', IV: '4' }[r.division] ?? ''
  return letter + div
}

/** Ordinal for comparing ranks: Iron IV = 0 … Diamond I = 27, Master+ by LP on top. */
export function rankValue(r: Pick<Rank, 'tier' | 'division' | 'lp'> | null | undefined): number | null {
  if (!r) return null
  const tier = (TIERS as readonly string[]).indexOf(r.tier)
  if (tier < 0) return null
  if (tier >= 7) return 28 + r.lp / 100
  const div = { IV: 0, III: 1, II: 2, I: 3 }[r.division] ?? 0
  return tier * 4 + div + r.lp / 100
}

/** CSS colour of a tier (rank names and crests only): a token, so it follows the theme. */
export function tierColor(tier: string | null | undefined): string {
  return tier && (TIERS as readonly string[]).includes(tier) ? `var(--tier-${tier.toLowerCase()})` : 'var(--text-2)'
}

/** Dark-theme tier colours as "r g b", for `rgb(var(--x) / a)` washes; null when unranked. */
const TIER_RGB: Record<string, string> = {
  IRON: '138 127 122',
  BRONZE: '176 113 77',
  SILVER: '159 177 189',
  GOLD: '225 183 90',
  PLATINUM: '79 184 168',
  EMERALD: '46 194 126',
  DIAMOND: '111 140 255',
  MASTER: '179 107 255',
  GRANDMASTER: '255 93 108',
  CHALLENGER: '244 210 122',
}
export const tierRgb = (tier: string | null | undefined): string | null => TIER_RGB[tier ?? ''] ?? null

export const winRate = (x: Pick<Totals, 'games' | 'wins'>) => (x.games ? x.wins / x.games : 0)
export const kda = (x: Pick<Totals, 'kills' | 'deaths' | 'assists'>) => (x.kills + x.assists) / Math.max(1, x.deaths)

const QUEUES: Record<number, string> = {
  0: tk('Custom'),
  400: tk('Normal Draft'),
  420: tk('Ranked Solo/Duo'),
  430: tk('Normal Blind'),
  440: tk('Ranked Flex'),
  450: tk('ARAM'),
  480: tk('Swiftplay'),
  490: tk('Quickplay'),
  700: tk('Clash'),
  720: tk('ARAM Clash'),
  830: tk('Co-op vs AI'),
  840: tk('Co-op vs AI'),
  850: tk('Co-op vs AI'),
  870: tk('Co-op vs AI'),
  880: tk('Co-op vs AI'),
  890: tk('Co-op vs AI'),
  900: tk('ARURF'),
  1020: tk('One for All'),
  1300: tk('Nexus Blitz'),
  1700: tk('Arena'),
  1710: tk('Arena'),
  1750: tk('Arena'),
  1810: tk('Swarm'),
  1900: tk('URF'),
  2300: tk('Brawl'),
  2400: tk('ARAM: Mayhem'),
}

/** Queue id → display name ("Ranked Solo/Duo"). */
export const queueName = (id: number, t: Translate = english) => t(QUEUES[id] ?? tk('Custom'))

/** Queue filters of match lists: queue ids per filter (`null`: every queue). */
export const QUEUE_FILTERS = [
  { id: tk('all'), label: tk('All queues'), queues: null },
  { id: tk('solo'), label: tk('Ranked Solo/Duo'), queues: [420] },
  { id: tk('flex'), label: tk('Ranked Flex'), queues: [440] },
  { id: tk('normal'), label: tk('Normal'), queues: [400, 430, 480, 490] },
  { id: tk('aram'), label: tk('ARAM'), queues: [450, 720, 2400] },
  { id: tk('arena'), label: tk('Arena'), queues: [1700, 1710, 1750] },
] as const

export const POSITIONS: Record<Position, string> = {
  TOP: tk('Top'),
  JUNGLE: tk('Jungle'),
  MID: tk('Mid'),
  ADC: tk('Bot'),
  SUPPORT: tk('Support'),
}
export const positionName = (p: Position | null | undefined, t: Translate = english) => (p ? t(POSITIONS[p]) : '')

/** Earned badges: what the data says the player did best in that game. */
export const BADGES: Record<Badge, { label: string; tip: string }> = {
  mvp: { label: tk('MVP'), tip: tk('Best player of the winning team') },
  ace: { label: tk('ACE'), tip: tk('Best player of the losing team') },
  carry_damage: { label: tk('Most damage'), tip: tk('Most damage to champions in the game') },
  tank: { label: tk('Most tanked'), tip: tk('Most damage taken and mitigated in the game') },
  vision: { label: tk('Best vision'), tip: tk('Highest vision score in the game') },
  cc: { label: tk('Most CC'), tip: tk('Most crowd control in the game') },
  objectives: { label: tk('Objectives'), tip: tk('Most damage to objectives in the game') },
  first_blood: { label: tk('First blood'), tip: tk('First blood') },
  triple: { label: tk('Triple kill'), tip: tk('Triple kill') },
  quadra: { label: tk('Quadra kill'), tip: tk('Quadra kill') },
  penta: { label: tk('Penta kill'), tip: tk('Penta kill') },
  deathless: { label: tk('Deathless'), tip: tk('No deaths in a game of 15 minutes or more') },
  lane_won: { label: tk('Lane won'), tip: tk('1000+ gold ahead of the lane opponent at 15 minutes') },
}

/** Rarest and most telling first: a row shows the first two. MVP / ACE live in the score column. */
const BADGE_ORDER: Badge[] = ['penta', 'quadra', 'triple', 'lane_won', 'carry_damage', 'deathless', 'first_blood', 'objectives', 'vision', 'tank', 'cc']
export const topBadges = (list: readonly Badge[] | null | undefined, max = 2): Badge[] => BADGE_ORDER.filter((b) => list?.includes(b)).slice(0, max)

/** A count with its noun, singular for one: "1 game", "3 games". */
const COUNTS = {
  games: [tk('{n} game'), tk('{n} games')],
  wins: [tk('{n} win'), tk('{n} wins')],
  kills: [tk('{n} kill'), tk('{n} kills')],
  deaths: [tk('{n} death'), tk('{n} deaths')],
  events: [tk('{n} event'), tk('{n} events')],
  changes: [tk('{n} change'), tk('{n} changes')],
} as const
export type CountNoun = keyof typeof COUNTS
export const count = (n: number, noun: CountNoun, t: Translate = english) => t(COUNTS[noun][n === 1 ? 0 : 1], { n })
