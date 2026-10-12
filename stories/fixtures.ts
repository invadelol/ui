/**
 * Story fixtures: the desktop app's browser-preview data (src/dev/mock.ts and mocks/profile.ts),
 * so the stories show what the app shows. Seeded, so every build draws the same games.
 */
import { SCORE_CATEGORIES } from '../src/logic'
import type { Badge, Kill, MatchDetail, MatchSummary, Objective, PlayedWith, PlayerCard, PlayerView, Position, ProfileView, TeamView } from '../src/logic'


let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]

const CHAMPS = [45, 99, 103, 31, 147, 4, 134, 69, 875, 63]
const now = Date.now()

export const games: MatchSummary[] = Array.from({ length: 30 }, (_, i) => {
  const duration = 1300 + Math.floor(rnd() * 900)
  const win = rnd() > 0.45
  const kills = Math.floor(rnd() * 14)
  const deaths = Math.floor(rnd() * 9)
  const assists = Math.floor(rnd() * 16)
  const cs = Math.floor((duration / 60) * (5 + rnd() * 3.5))
  return {
    gameId: 7_300_000_000 + i,
    matchId: null,
    creation: now - i * 3.6e6 * (4 + rnd() * 20),
    duration,
    queueId: pick([420, 420, 420, 400, 440, 450]),
    mapId: 11,
    championId: i < 12 ? pick([45, 45, 99, 103]) : pick(CHAMPS),
    win,
    remake: false,
    kills,
    deaths,
    assists,
    cs,
    csMin: cs / (duration / 60),
    gold: Math.floor(duration * (6 + rnd() * 3)),
    damage: Math.floor(duration * (12 + rnd() * 20)),
    vision: Math.floor((duration / 60) * (0.6 + rnd() * 1.2)),
    level: 13 + Math.floor(rnd() * 5),
    items: [3089, 3020, 4645, 3157, 3135, 0, 3340],
    spells: [4, 14],
    keystone: 8112,
    primaryStyle: 8100,
    subStyle: 8200,
    lane: 'MID',
    placement: 0,
    score: { gameId: 7_300_000_000 + i, score: 3 + rnd() * 6.5, rank: 1 + Math.floor(rnd() * 10), tag: win && rnd() > 0.7 ? 'mvp' : !win && rnd() > 0.7 ? 'ace' : '' },
  }
})
// Per-champion loadouts, lanes, lane opponents, kill participation and earned badges, so profile
// rows look like real games (own seed: the generator above keeps its sequence).
{
  let s2 = 11
  const r2 = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647)
  const KITS: Record<number, { lane: MatchSummary['lane']; items: number[]; spells: number[]; keystone: number; primary: number; sub: number; opp: number[] }> = {
    45: { lane: 'MID', items: [6655, 3020, 3089, 4645, 3157, 3135, 3340], spells: [4, 14], keystone: 8112, primary: 8100, sub: 8200, opp: [103, 134, 238, 157] },
    99: { lane: 'SUPPORT', items: [6655, 3020, 3118, 4645, 3089, 0, 3364], spells: [4, 14], keystone: 8229, primary: 8200, sub: 8100, opp: [412, 89, 63] },
    103: { lane: 'MID', items: [6655, 3020, 4645, 3157, 3089, 0, 3340], spells: [4, 14], keystone: 8112, primary: 8100, sub: 8200, opp: [45, 134, 245, 157] },
    31: { lane: 'TOP', items: [3068, 3047, 6665, 3075, 3083, 0, 3340], spells: [4, 12], keystone: 8010, primary: 8000, sub: 8400, opp: [875, 266, 122] },
    147: { lane: 'SUPPORT', items: [6620, 3158, 3504, 3222, 0, 0, 3364], spells: [4, 3], keystone: 8214, primary: 8200, sub: 8300, opp: [412, 89, 99] },
    4: { lane: 'MID', items: [6655, 3020, 3089, 3157, 0, 0, 3340], spells: [4, 12], keystone: 8112, primary: 8100, sub: 8200, opp: [103, 238] },
    134: { lane: 'MID', items: [6655, 3020, 3089, 4645, 3135, 3157, 3340], spells: [4, 14], keystone: 8229, primary: 8200, sub: 8100, opp: [45, 103] },
    69: { lane: 'MID', items: [6653, 3116, 3003, 3157, 3089, 0, 3340], spells: [4, 12], keystone: 8010, primary: 8000, sub: 8200, opp: [134, 245] },
    875: { lane: 'TOP', items: [3078, 3047, 3053, 6333, 3071, 3026, 3340], spells: [4, 12], keystone: 8010, primary: 8000, sub: 8400, opp: [31, 266, 86] },
    63: { lane: 'SUPPORT', items: [6653, 3020, 3165, 3116, 0, 0, 3364], spells: [4, 14], keystone: 8229, primary: 8200, sub: 8100, opp: [99, 147] },
  }
  const BADGES = ['carry_damage', 'first_blood', 'lane_won', 'vision', 'deathless', 'triple', 'objectives', 'tank'] as const
  games.forEach((g, i) => {
    const kit = KITS[g.championId]
    if (!kit) return
    const aram = g.queueId === 450
    Object.assign(g, {
      lane: aram ? null : kit.lane,
      items: kit.items.map((it, k) => (k > 2 && k < 6 && r2() < 0.25 ? 0 : it)),
      spells: aram ? [4, 32] : kit.spells,
      keystone: kit.keystone,
      primaryStyle: kit.primary,
      subStyle: kit.sub,
    })
    if (!g.score) return
    // MVP / ACE: the best of the winning / losing team (here: the top two of the game).
    g.score.tag = g.score.rank <= 2 ? (g.win ? 'mvp' : 'ace') : ''
    const badges = BADGES.filter(() => r2() < 0.16).slice(0, 3)
    Object.assign(g.score, {
      opponent: aram || i % 7 === 3 ? null : kit.opp[i % kit.opp.length],
      kp: Math.min(1, (g.kills + g.assists) / Math.max(1, g.kills + 6 + Math.floor(r2() * 14))),
      badges: g.deaths === 0 ? ['deathless', ...badges.filter((b) => b !== 'deathless')] : badges,
    })
  })
}

export const card: PlayerCard = {
  puuid: 'mock-self',
  gameName: 'Aster',
  tagLine: 'EUW',
  icon: 6634,
  level: 412,
  private: false,
  solo: { tier: 'EMERALD', division: 'II', lp: 64, wins: 61, losses: 52, provisional: false, previous: 'PLATINUM' },
  flex: { tier: 'PLATINUM', division: 'I', lp: 12, wins: 14, losses: 11, provisional: false, previous: '' },
  recent: {
    games: 20,
    wins: 12,
    kills: 142,
    deaths: 98,
    assists: 171,
    cs: 4200,
    seconds: 20 * 1800,
    results: games.slice(0, 20).map((g) => g.win),
    streak: 2,
    lanes: [['MID', 16], ['TOP', 4]],
    champions: [45, 99, 103].map((championId, i) => ({ championId, games: 8 - i * 2, wins: 5 - i, kills: 60, deaths: 40, assists: 70, cs: 1500, seconds: 12000 })),
    ranked: 16,
  },
  mastery: [
    { championId: 45, championLevel: 38, championPoints: 402_115, lastPlayTime: now - 3.6e6 },
    { championId: 99, championLevel: 21, championPoints: 188_420, lastPlayTime: now - 2 * 864e5 },
    { championId: 103, championLevel: 17, championPoints: 141_903, lastPlayTime: now - 5 * 864e5 },
  ],
  offline: false,
}

const POSITIONS: Position[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']
const LANE_CHAMPS: Record<Position, number[]> = {
  TOP: [266, 86, 122, 875],
  JUNGLE: [64, 121, 254, 19],
  MID: [103, 238, 157, 245],
  ADC: [222, 51, 145, 202],
  SUPPORT: [412, 89, 147, 25],
}
const ITEMS: Record<Position, number[]> = {
  TOP: [3078, 3071, 3047, 3053, 6333, 3026, 3340],
  JUNGLE: [6692, 3142, 3111, 3814, 6694, 0, 3364],
  MID: [3089, 3020, 4645, 3157, 3135, 0, 3340],
  ADC: [6672, 3006, 3031, 3094, 3036, 0, 3363],
  SUPPORT: [3190, 3117, 3109, 2065, 3222, 0, 3364],
}
const SPELLS: Record<Position, number[]> = { TOP: [4, 12], JUNGLE: [4, 11], MID: [4, 14], ADC: [4, 7], SUPPORT: [4, 3] }
/** Primary tree, keystone + 3 runes; secondary tree + 2 runes. */
const RUNES: Record<Position, [number[], number[]]> = {
  TOP: [[8000, 8010, 9111, 9104, 8299], [8400, 8444, 8451]],
  JUNGLE: [[8100, 8128, 8126, 8140, 8135], [8000, 9111, 8014]],
  MID: [[8100, 8112, 8139, 8140, 8105], [8200, 8226, 8237]],
  ADC: [[8000, 8008, 9101, 9104, 8014], [8300, 8304, 8345]],
  SUPPORT: [[8400, 8439, 8463, 8473, 8242], [8300, 8347, 8345]],
}
const NAMES = [
  ['Bramble', 'EUW'], ['Cinder', '0001'], ['Driftwood', 'EUW'], ['Ember', '0002'], ['Fennel', '0003'],
  ['Gale', '0004'], ['Hollow', '0005'], ['Ivy', '0006'], ['Juniper', '0007'], ['Kestrel', 'EUW'],
]


const champRows = (ids: number[]) =>
  ids.map((championId, i) => ({
    championId,
    games: 30 - i * 5,
    wins: 17 - i * 3,
    kills: 180 - i * 20,
    deaths: 120 - i * 15,
    assists: 200 - i * 25,
    cs: 5600 - i * 800,
    seconds: 30 * 1800 - i * 9000,
    damage: 700_000 - i * 90_000,
    gold: 350_000 - i * 50_000,
    vision: 600 - i * 70,
  }))

const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND']
const DIVS = ['IV', 'III', 'II', 'I']
/** A snapshot as the app records it: ladder value → tier, division, LP. */
const point = (t: number, queue: 'solo' | 'flex', value: number, wins: number, losses: number) => ({
  t,
  queue,
  tier: TIERS[Math.floor(value / 400)],
  division: DIVS[Math.floor((value % 400) / 100)],
  lp: value % 100,
  wins,
  losses,
  value,
})

/**
 * LP snapshots the way the app records them: one after each ranked game (settled ~75 s after
 * its end), older history before the mocked games, and one gap where two games share a
 * snapshot (the LP of those two games is unknown).
 */

/** The full detail of one of the games above (both teams, a timeline built from its own events). */
export function detailOf(g: MatchSummary): MatchDetail {
  const gameId = g.gameId
  let seed = gameId % 2147483647 || 1
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))

  const duration = g.duration
  const minutes = duration / 60
  const selfBlue = gameId % 2 === 0
  const blueWin = selfBlue ? g.win : !g.win
  const selfPos: Position = g.lane ?? 'MID'

  const players: PlayerView[] = []
  for (let i = 0; i < 10; i++) {
    const teamId = i < 5 ? 100 : 200
    const pos = POSITIONS[i % 5]
    const isSelf = pos === selfPos && (teamId === 100) === selfBlue
    const win = teamId === 100 ? blueWin : !blueWin
    const pool = LANE_CHAMPS[pos].filter((c) => c !== g.championId)
    const isOpp = pos === selfPos && !isSelf
    const championId = isSelf ? g.championId : isOpp && g.score?.opponent ? g.score.opponent : pool[(i < 5 ? 0 : 1) + (gameId % 2)]
    const support = pos === 'SUPPORT'
    const kills = isSelf ? g.kills : support ? int(0, 3) : int(win ? 3 : 1, win ? 12 : 7)
    const deaths = isSelf ? g.deaths : int(win ? 1 : 3, win ? 6 : 10)
    const assists = isSelf ? g.assists : support ? int(8, 22) : int(2, 14)
    const cs = isSelf ? g.cs : support ? int(20, 50) : pos === 'JUNGLE' ? Math.round(minutes * (5 + rnd() * 1.5)) : Math.round(minutes * (6 + rnd() * 3))
    const gold = isSelf ? g.gold : Math.round(minutes * (support ? 260 : 380 + rnd() * 120) + kills * 300)
    const damage = isSelf ? g.damage : Math.round(minutes * (support ? 300 + rnd() * 200 : 600 + rnd() * 600))
    const physical = Math.round(damage * (pos === 'ADC' || pos === 'TOP' ? 0.75 : 0.2))
    const trueDamage = Math.round(damage * 0.06)
    const [primary, secondary] = RUNES[pos]
    const [name, tag] = isSelf ? ['Aster', 'EUW'] : NAMES[i]
    players.push({
      participantId: i + 1,
      teamId,
      win,
      puuid: isSelf ? 'mock-self' : `mock-p${i + 1}`,
      gameName: name,
      tagLine: tag,
      championId,
      level: isSelf ? g.level : int(11, 18),
      spells: isSelf ? g.spells : SPELLS[pos],
      perks: [...primary.slice(1), ...secondary.slice(1)],
      styles: [primary[0], secondary[0]],
      items: isSelf ? g.items : ITEMS[pos].map((it, k) => (k < 6 && rnd() < 0.15 ? 0 : it)),
      kills,
      deaths,
      assists,
      kp: 0,
      cs,
      jungleCs: pos === 'JUNGLE' ? Math.round(cs * 0.85) : int(0, 8),
      csMin: cs / minutes,
      gold,
      goldShare: 0,
      damage,
      physical,
      magic: damage - physical - trueDamage,
      trueDamage,
      damageShare: 0,
      damageTaken: Math.round(minutes * (pos === 'TOP' || pos === 'JUNGLE' ? 1100 : 650) * (0.8 + rnd() * 0.4)),
      mitigated: Math.round(minutes * (pos === 'TOP' ? 900 : 350) * (0.8 + rnd() * 0.4)),
      healing: Math.round(minutes * (support ? 260 : 90) * rnd()),
      vision: isSelf ? g.vision : Math.round(minutes * (support ? 2.4 : pos === 'JUNGLE' ? 1.3 : 0.8)),
      wardsPlaced: support ? int(25, 45) : int(6, 16),
      wardsKilled: int(1, 9),
      controlWards: support ? int(4, 9) : int(0, 3),
      ccTime: int(4, 40),
      objectiveDamage: Math.round(damage * (pos === 'JUNGLE' ? 1.6 : 0.4)),
      turretDamage: Math.round(damage * (pos === 'TOP' || pos === 'ADC' ? 0.35 : 0.12)),
      doubles: kills > 6 ? 1 : 0,
      triples: kills > 10 ? 1 : 0,
      quadras: 0,
      pentas: 0,
      largestSpree: Math.min(kills, int(0, 6)),
      largestMulti: kills > 10 ? 3 : kills > 6 ? 2 : 1,
      firstBlood: false,
      position: pos,
      opponent: i < 5 ? i + 6 : i - 4,
      gold15: null,
      xp15: null,
      cs15: null,
      score: null,
      parts: [],
      rank: 0,
      badges: [],
      skills: [],
      augments: [],
      placement: 0,
    })
  }

  // Team totals, shares, lane leads at 15.
  const teams: TeamView[] = [100, 200].map((teamId) => {
    const ps = players.filter((p) => p.teamId === teamId)
    const win = ps[0].win
    const sum = (f: (p: PlayerView) => number) => ps.reduce((s, p) => s + f(p), 0)
    const kills = sum((p) => p.kills)
    for (const p of ps) {
      if (p.puuid !== 'mock-self') p.assists = Math.min(p.assists, Math.max(0, kills - p.kills - int(0, 3)))
      p.kp = kills ? (p.kills + p.assists) / kills : 0
      p.goldShare = p.gold / sum((x) => x.gold)
      p.damageShare = p.damage / sum((x) => x.damage)
    }
    const dragons = win ? int(2, 4) : int(0, 2)
    return {
      teamId,
      win,
      bans: LANE_CHAMPS[POSITIONS[teamId === 100 ? 1 : 3]].slice(2).concat([57, 350, teamId === 100 ? 555 : 0]),
      kills,
      deaths: sum((p) => p.deaths),
      assists: ps.reduce((n, p) => n + p.assists, 0),
      gold: sum((p) => p.gold),
      damage: sum((p) => p.damage),
      towers: win ? int(7, 10) : int(1, 4),
      inhibitors: win ? int(1, 2) : 0,
      dragons,
      barons: win ? 1 : 0,
      heralds: int(0, 1),
      grubs: win ? int(3, 6) : int(0, 3),
      dragonTypes: ['FIRE_DRAGON', 'HEXTECH_DRAGON', 'WATER_DRAGON', 'EARTH_DRAGON'].slice(0, dragons),
      firstBlood: win,
      firstTower: win,
      firstDragon: rnd() > 0.4 === win,
      firstBaron: win,
      firstInhibitor: win,
    }
  })
  for (const p of players) {
    const opp = players[p.opponent! - 1]
    const lead = (p.gold - opp.gold) * 0.35 + (rnd() - 0.5) * 600
    p.gold15 = Math.round(lead)
    p.xp15 = Math.round(lead * 0.8)
    p.cs15 = Math.round(lead / 40)
  }

  // Invade score: KDA, KP and damage share, then ranks and badges.
  for (const p of players) {
    const raw = ((p.kills + p.assists) / Math.max(1, p.deaths)) * 0.9 + p.kp * 3 + p.damageShare * 8 + (p.win ? 1.2 : 0)
    p.score = Math.max(0.8, Math.min(9.8, raw * 0.75))
  }
  const self = players.find((p) => p.puuid === 'mock-self')!
  if (g.score?.kp != null) self.kp = g.score.kp
  if (g.score) {
    // The row's score and placement hold: the others are spread around them, and MVP / ACE land
    // where the row says (the best of each team).
    self.score = g.score.score
    const at = Math.max(1, Math.min(10, g.score.rank))
    const others = players.filter((p) => p !== self).sort((a, b) => b.score! - a.score!)
    const mate = (p: PlayerView) => p.teamId === self.teamId
    if (at === 2 && g.score.tag) others.unshift(...others.splice(others.findIndex((p) => !mate(p)), 1))
    if (at >= 3 && !others.slice(0, at - 1).some(mate)) others.unshift(...others.splice(others.findIndex(mate), 1))
    let r = 1
    for (const p of others) {
      if (r === at) r++
      p.rank = r
      p.score = Math.max(0.3, Math.min(9.9, self.score + (at - r) * 0.42 + (rnd() - 0.5) * 0.2))
      r++
    }
    self.rank = at
  } else [...players].sort((a, b) => b.score! - a.score!).forEach((p, i) => (p.rank = i + 1))
  for (const team of teams) {
    const ps = players.filter((p) => p.teamId === team.teamId).sort((a, b) => b.score! - a.score!)
    ps[0].badges.push(team.win ? 'mvp' : 'ace')
  }
  const most = (f: (p: PlayerView) => number, badge: Badge) => [...players].sort((a, b) => f(b) - f(a))[0].badges.push(badge)
  most((p) => p.damage, 'carry_damage')
  most((p) => p.damageTaken + (p.mitigated ?? 0), 'tank')
  most((p) => p.vision, 'vision')
  most((p) => p.objectiveDamage, 'objectives')
  for (const p of players) {
    if (p.deaths === 0) p.badges.push('deathless')
    if ((p.gold15 ?? 0) >= 1000) p.badges.push('lane_won')
    if (p.triples) p.badges.push('triple')
  }
  // The profile's player keeps the badges its row shows.
  if (g.score?.badges) {
    for (const p of players) if (p !== self) p.badges = p.badges.filter((b) => b === 'mvp' || b === 'ace' || !g.score!.badges!.includes(b))
    self.badges = [...self.badges.filter((b) => b === 'mvp' || b === 'ace'), ...g.score.badges]
  }

  // What each score is made of (the role weights invade.lol uses), and a skill order: the three
  // basics in a role-like order, the first maxed first, R at 6, 11 and 16.
  const WEIGHTS: Record<Position, number[]> = { TOP: [25, 25, 25, 8, 17], JUNGLE: [30, 15, 15, 15, 25], MID: [28, 30, 25, 7, 10], ADC: [27, 32, 28, 5, 8], SUPPORT: [40, 15, 0, 40, 5] }
  const ORDERS = [[1, 3, 2], [1, 2, 3], [3, 1, 2], [2, 1, 3]]
  for (const p of players) {
    const base = p.score! * 10
    p.parts = SCORE_CATEGORIES.map((key, k) => ({ key, value: Math.max(4, Math.min(97, Math.round(base + (rnd() - 0.5) * 40))), weight: WEIGHTS[p.position!][k] })).filter((x) => x.weight)
    const order = ORDERS[p.participantId % ORDERS.length]
    const left = [4, 4, 4]
    p.skills = Array.from({ length: p.level }, (_, i) => {
      const level = i + 1
      if (level === 6 || level === 11 || level === 16) return 4
      const k = level <= 3 ? level - 1 : left.findIndex((n) => n > 0)
      if (level > 3) left[k]--
      return order[k]
    })
  }

  // Timeline: one frame per minute plus the end.
  const t: number[] = []
  for (let s = 0; s < duration; s += 60) t.push(s)
  t.push(duration)
  const kills: Kill[] = []
  for (const p of players) {
    for (let k = 0; k < p.kills; k++) {
      const enemies = players.filter((x) => x.teamId !== p.teamId)
      const mates = players.filter((x) => x.teamId === p.teamId && x !== p)
      const victim = enemies[int(0, 4)]
      kills.push({
        t: int(180, duration - 30),
        killer: p.participantId,
        victim: victim.participantId,
        assists: mates.filter(() => rnd() > 0.6).map((x) => x.participantId),
        x: int(1500, 13300),
        y: int(1500, 13300),
      })
    }
  }
  kills.sort((a, b) => a.t - b.t)

  const winner = blueWin ? 100 : 200
  const loser = blueWin ? 200 : 100
  const jungler = (team: number) => players.find((p) => p.teamId === team && p.position === 'JUNGLE')!.participantId
  const objectives: Objective[] = [
    { t: 330, kind: 'grubs', sub: '', team: winner, lane: '', killer: jungler(winner) },
    { t: 335, kind: 'grubs', sub: '', team: winner, lane: '', killer: jungler(winner) },
    { t: 340, kind: 'grubs', sub: '', team: winner, lane: '', killer: jungler(winner) },
    { t: 390, kind: 'dragon', sub: 'FIRE_DRAGON', team: loser, lane: '', killer: jungler(loser) },
    { t: 610, kind: 'tower', sub: 'OUTER_TURRET', team: winner, lane: 'BOT_LANE', killer: winner === 100 ? 4 : 9 },
    { t: 700, kind: 'herald', sub: '', team: winner, lane: '', killer: jungler(winner) },
    { t: 760, kind: 'dragon', sub: 'HEXTECH_DRAGON', team: winner, lane: '', killer: jungler(winner) },
    { t: 845, kind: 'tower', sub: 'OUTER_TURRET', team: loser, lane: 'TOP_LANE', killer: loser === 100 ? 1 : 6 },
    { t: 910, kind: 'tower', sub: 'OUTER_TURRET', team: winner, lane: 'MID_LANE', killer: winner === 100 ? 3 : 8 },
    { t: 1090, kind: 'dragon', sub: 'WATER_DRAGON', team: winner, lane: '', killer: jungler(winner) },
    { t: 1180, kind: 'tower', sub: 'INNER_TURRET', team: winner, lane: 'MID_LANE', killer: winner === 100 ? 3 : 8 },
    { t: Math.min(duration - 200, 1320), kind: 'baron', sub: '', team: winner, lane: '', killer: jungler(winner) },
    { t: Math.min(duration - 120, 1400), kind: 'tower', sub: 'BASE_TURRET', team: winner, lane: 'MID_LANE', killer: winner === 100 ? 4 : 9 },
    { t: Math.min(duration - 90, 1430), kind: 'inhibitor', sub: '', team: winner, lane: 'MID_LANE', killer: winner === 100 ? 3 : 8 },
    { t: duration - 20, kind: 'tower', sub: 'NEXUS_TURRET', team: winner, lane: 'MID_LANE', killer: winner === 100 ? 4 : 9 },
  ].sort((a, b) => a.t - b.t) as Objective[]
  if (kills[0]) players[kills[0].killer - 1].firstBlood = true

  // Gold, CS and XP built the way a game builds them, from this game's own events: passive income,
  // farm that varies minute to minute (recalls, roams) and stops while dead, kill and assist
  // bounties, turret and Baron gold. Each curve is then scaled so it ends on the scoreboard's total.
  const respawn = (s: number) => Math.min(60, 8 + (s / 60) * 2.2)
  const farmRate = (p: PlayerView, minute: number) =>
    p.position === 'SUPPORT' ? 0.7 : p.position === 'JUNGLE' ? 5 + Math.min(1.5, minute / 12) : 6.8 + Math.min(1.8, minute / 10)
  const build = (p: PlayerView) => {
    const pid = p.participantId
    const deaths = kills.filter((k) => k.victim === pid).map((k) => [k.t, k.t + respawn(k.t)] as const)
    const recalls = new Set<number>()
    for (let m = 3 + int(0, 2); m < t.length; m += 4 + int(0, 3)) recalls.add(m)
    let gold = 500
    let farm = 0
    let xp = 0
    const g = [gold]
    const c = [0]
    const x = [0]
    for (let k = 1; k < t.length; k++) {
      const [from, to] = [t[k - 1], t[k]]
      const span = to - from
      const dead = deaths.reduce((sum, [d0, d1]) => sum + Math.max(0, Math.min(to, d1) - Math.max(from, d0)), 0)
      const alive = Math.max(0, 1 - dead / span)
      const minute = from / 60
      const cs = from < 90 ? 0 : farmRate(p, minute) * (span / 60) * alive * (recalls.has(k) ? 0.35 : 0.7 + rnd() * 0.55)
      farm += cs
      gold += Math.max(0, to - Math.max(from, 65)) * (122 / 60) + cs * (19 + minute * 0.45)
      xp += cs * 58 + span * alive * (p.position === 'SUPPORT' ? 9 : 3)
      for (const kill of kills) {
        if (kill.t < from || kill.t >= to) continue
        if (kill.killer === pid) {
          gold += kill === kills[0] ? 400 : 300
          xp += 260
        } else if (kill.assists.includes(pid)) {
          gold += 150 / Math.max(1, kill.assists.length / 2)
          xp += 140
        }
      }
      for (const o of objectives) {
        if (o.t < from || o.t >= to || o.team !== p.teamId) continue
        if (o.kind === 'tower') gold += o.killer === pid ? 300 : 50
        if (o.kind === 'baron') gold += 300
        if (o.kind === 'dragon' || o.kind === 'herald') xp += 200
      }
      g.push(gold)
      c.push(farm)
      x.push(xp)
    }
    const fit = (row: number[], start: number, end: number) => {
      const last = row[row.length - 1]
      return row.map((v) => Math.round(start + ((v - start) * (end - start)) / Math.max(1, last - start)))
    }
    return { gold: fit(g, 500, p.gold), cs: fit(c, 0, p.cs), xp: fit(x, 0, p.level * 1100) }
  }
  const built = players.map(build)
  const gold = built.map((b) => b.gold)
  const cs = built.map((b) => b.cs)
  const xp = built.map((b) => b.xp)
  const level = xp.map((row) => row.map((v) => Math.min(18, 1 + Math.floor(Math.sqrt(v / 90)))))
  const side = (rows: number[][], team: number) => t.map((_, k) => rows.reduce((s, r, i) => s + (players[i].teamId === team ? r[k] : 0), 0))
  const goldDiff = side(gold, 100).map((v, k) => v - side(gold, 200)[k])
  const xpDiff = side(xp, 100).map((v, k) => v - side(xp, 200)[k])
  // Lane leads at 15:00 read off these curves, as the app computes them from a real timeline.
  const at15 = t.indexOf(900)
  players.forEach((p, i) => {
    const o = players.findIndex((x) => x.participantId === p.opponent)
    if (at15 < 0 || o < 0) return
    p.gold15 = gold[i][at15] - gold[o][at15]
    p.xp15 = xp[i][at15] - xp[o][at15]
    p.cs15 = cs[i][at15] - cs[o][at15]
    // The profile's player keeps the badges its row shows.
    if (p === self) return
    p.badges = p.badges.filter((b) => b !== 'lane_won')
    if (p.gold15 >= 1000) p.badges.push('lane_won')
  })

  return {
    gameId,
    creation: g.creation,
    duration,
    queueId: g.queueId,
    mapId: 11,
    version: '16.19.712.4851',
    remake: g.remake,
    teams,
    players,
    timeline: { t, gold, xp, cs, level, goldDiff, xpDiff, kills, objectives },
    fromCore: false,
  }
}

/**
 * LP snapshots the way the app records them: one after each ranked game, older history before the
 * games above, and one gap where two games share a snapshot (the LP of those two is unknown).
 */
function lpHistory(): ProfileView['lp'] {
  const ranked = games.filter((g) => !g.remake && (g.queueId === 420 || g.queueId === 440)).sort((a, b) => a.creation - b.creation)
  const out: ProfileView['lp'] = []
  const state = { solo: { v: 2150, w: 47, l: 44 }, flex: { v: 1688, w: 9, l: 8 } }
  const first = ranked[0]?.creation ?? now
  for (let i = 0; i < 14; i++) {
    state.solo.v += [22, -19, 21, 20, -18, -20, 23, 19, -21, 18, 22, -17, 20, -19][i]
    i % 2 ? state.solo.l++ : state.solo.w++
    out.push(point(first - (15 - i) * 7.2e7, 'solo', state.solo.v, state.solo.w, state.solo.l))
  }
  out.push(point(first - 3.6e6, 'flex', state.flex.v, state.flex.w, state.flex.l))
  ranked.forEach((g, i) => {
    const q = g.queueId === 420 ? state.solo : state.flex
    q.v += g.win ? 18 + (g.gameId % 7) : -(15 + (g.gameId % 6))
    g.win ? q.w++ : q.l++
    if (i === 5) return // two games, one snapshot
    out.push(point(g.creation + g.duration * 1000 + 90_000, g.queueId === 420 ? 'solo' : 'flex', q.v, q.w, q.l))
  })
  return out.sort((a, b) => a.t - b.t)
}

/** The signed-in player's own profile (LP history, ranks from it). */
export const profile: ProfileView = (() => {
  const lp = lpHistory()
  const last = (q: 'solo' | 'flex') => [...lp].reverse().find((p) => p.queue === q)
  const rank = (q: 'solo' | 'flex', previous: string) => {
    const p = last(q)
    return p ? { tier: p.tier, division: p.division, lp: p.lp, wins: p.wins, losses: p.losses, provisional: false, previous } : null
  }
  return {
    card: { ...card, solo: rank('solo', 'PLATINUM') ?? card.solo, flex: rank('flex', '') ?? card.flex },
    isSelf: true,
    isOwn: true,
    champions: champRows([45, 99, 103, 31, 147, 134, 875]),
    lanes: [['MID', 22], ['TOP', 6], ['SUPPORT', 4]],
    lp,
  }
})()

/** Another player, seen from outside: hidden losses, no LP history, mastery only from their card. */
export const otherProfile: ProfileView = {
  card: {
    ...card,
    puuid: 'mock-p2',
    gameName: 'Cinder',
    tagLine: '0001',
    icon: 5026,
    level: 194,
    solo: { tier: 'DIAMOND', division: 'IV', lp: 23, wins: 88, losses: 0, provisional: false, previous: 'EMERALD' },
    flex: null,
    mastery: [157, 238, 103, 84, 4].map((championId, i) => ({ championId, championLevel: 40 - i * 7, championPoints: 620_000 - i * 110_000, lastPlayTime: now })),
  },
  isSelf: false,
  isOwn: false,
  champions: champRows([157, 238, 103, 84]),
  lanes: [['MID', 18], ['ADC', 7]],
  lp: [],
}

/** Teammates over the latest full games: two premades and a few repeat randoms. */
export const playedWith: PlayedWith = {
  games: 28,
  mates: [
    { puuid: 'mock-p2', gameName: 'Cinder', tagLine: '0001', icon: 5367, games: 9, wins: 6, last: now - 2 * 3600e3 },
    { puuid: 'mock-p3', gameName: 'Ember', tagLine: '0002', icon: 4648, games: 6, wins: 3, last: now - 864e5 },
    { puuid: 'mock-p4', gameName: 'Fennel', tagLine: '0003', icon: 5212, games: 3, wins: 2, last: now - 3 * 864e5 },
    { puuid: 'mock-p5', gameName: 'Northwind', tagLine: 'EUW', icon: 4568, games: 2, wins: 0, last: now - 5 * 864e5 },
  ],
}

export const scores = new Map(games.flatMap((g) => (g.score ? [[g.gameId, g.score] as const] : [])))
