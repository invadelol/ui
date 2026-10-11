/**
 * invade.lol → the shared model. The website stores matches in its own shape (`CoreMatch`, as its
 * API serves them); these adapters turn one into the `MatchDetail` / `MatchSummary` / `Rank` every
 * view reads, so the website renders the same components as the desktop app. Nothing is estimated:
 * a value the stored match does not carry is `null` (or left out), and views hide its row.
 */
import type { Badge, Kill, MatchDetail, MatchSummary, Objective, PlayerView, Position, Rank, TeamView, TimelineView } from './types'

// --- invade.lol's shapes (inertia/lib/types.ts), the fields read here --------------------------------

export interface CoreParticipant {
  puuid: string
  gameName: string
  tagLine: string
  championId: number
  teamId: number
  win: boolean
  kills: number
  deaths: number
  assists: number
  cs: number
  level: number
  champLevel: number
  items: number[]
  spells: number[]
  perks: { primary: number; sub: number; keystone: number }
  visionScore: number
  damageTaken: number
  totalDamageDealtToChampions: number
  physicalDamageDealtToChampions: number
  magicDamageDealtToChampions: number
  trueDamageDealtToChampions: number
  damageDealtToObjectives: number
  damageDealtToTurrets: number
  visionWardsBoughtInGame: number
  /** Riot's `TOP` `JUNGLE` `MIDDLE` `BOTTOM` `UTILITY`, empty in roleless modes. */
  position: string
  goldEarned: number
  wardsPlaced: number
  wardsKilled: number
}

export interface CoreTimelineEntry {
  participantId: number
  puuid: string
  teamId: number
  frameMs: number
  level: number
  xp: number
  goldTotal: number
  cs: number
  jungleCs: number
  perks?: { primaryStyle: number; secondaryStyle: number; keystone: number; runes: number[] }
}

export interface CoreEvent {
  /** Seconds into the game. */
  t: number
  kind: 'kill' | Objective['kind']
  sub: string
  lane: string
  team: number
  killer: number
  victim: number
  assists: number[]
  x: number
  y: number
}

export interface CoreMatch {
  matchId: string
  gameStartMs: number
  /** Seconds. */
  duration: number
  queueId: number
  mapId: number
  patch: string
  t1Win: number
  t2Win: number
  t1Towers: number
  t2Towers: number
  t1Inhibs: number
  t2Inhibs: number
  t1Dragons: number
  t2Dragons: number
  t1Barons: number
  t2Barons: number
  t1Heralds: number
  t2Heralds: number
  t1Bans: number[]
  t2Bans: number[]
  participants: CoreParticipant[]
  timeline?: CoreTimelineEntry[]
  events?: CoreEvent[]
}

export interface CoreRank {
  queueType: string
  tier: string
  division: string
  leaguePoints: number
  wins: number
  /** Null when the rank came from another player's client, which hides losses. */
  losses: number | null
}

export interface FromCoreOptions {
  /** Invade score per puuid, 0‥100 (invade.lol's `lobbyScores`). Ranks, MVP and ACE follow from it. */
  scores?: Record<string, number>
  /** Earned badges per puuid (invade.lol's `earnedBadges` keys); unknown keys are dropped. */
  badges?: Record<string, readonly string[]>
}

const POSITION: Record<string, Position> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MID', BOTTOM: 'ADC', UTILITY: 'SUPPORT' }
const BADGE_KEYS = new Set<string>(['carry_damage', 'tank', 'vision', 'cc', 'objectives', 'first_blood', 'triple', 'quadra', 'penta', 'deathless', 'lane_won'])
/** Below five minutes a game is a remake. */
const REMAKE = 300
const FRAME_15 = 15 * 60 * 1000

/** `EUW1_7998180573` → 7998180573. */
export const gameIdOf = (matchId: string) => Number(matchId.slice(matchId.lastIndexOf('_') + 1)) || 0

/** The enemy in the same lane, else the mirrored slot (modes where Riot records no position). */
function laneOpponent(list: CoreParticipant[], p: CoreParticipant) {
  if (p.position) {
    const same = list.find((o) => o.teamId !== p.teamId && o.position === p.position)
    if (same) return same
  }
  const mine = list.filter((o) => o.teamId === p.teamId)
  const theirs = list.filter((o) => o.teamId !== p.teamId)
  return theirs[mine.indexOf(p)] ?? theirs[0]
}

/** One stored match as the detail views read it. */
export function fromCoreMatch(match: CoreMatch, opts: FromCoreOptions = {}): MatchDetail {
  const list = match.participants
  const frames = match.timeline ?? []
  const events = match.events ?? []
  const hasEvents = events.length > 0
  const minutes = Math.max(match.duration / 60, 1)
  const laned = list.some((p) => p.position in POSITION)

  // Participant ids come from the timeline (Riot's ids, the ones events use); without one, the
  // stored order stands in.
  const idOf = new Map<string, number>()
  for (const f of frames) if (f.puuid && !idOf.has(f.puuid)) idOf.set(f.puuid, f.participantId)
  const pid = (p: CoreParticipant) => idOf.get(p.puuid) ?? list.indexOf(p) + 1

  const times = [...new Set(frames.map((f) => f.frameMs))].sort((a, b) => a - b)
  const frameIndex = new Map(times.map((ms, k) => [ms, k]))
  const series = (puuid: string, read: (f: CoreTimelineEntry) => number) => {
    const row = new Array<number>(times.length).fill(0)
    for (const f of frames) if (f.puuid === puuid) row[frameIndex.get(f.frameMs)!] = read(f)
    // A player missing from a frame keeps their previous value.
    for (let k = 1; k < row.length; k++) if (!row[k] && row[k - 1]) row[k] = row[k - 1]
    return row
  }
  const gold = list.map((p) => series(p.puuid, (f) => f.goldTotal))
  const xp = list.map((p) => series(p.puuid, (f) => f.xp))
  const cs = list.map((p) => series(p.puuid, (f) => f.cs + f.jungleCs))
  const level = list.map((p) => series(p.puuid, (f) => f.level))
  const at15 = frameIndex.get(FRAME_15)

  const kills: Kill[] = events
    .filter((e) => e.kind === 'kill')
    .map((e) => ({ t: e.t, killer: e.killer, victim: e.victim, assists: e.assists ?? [], x: e.x, y: e.y }))
    .sort((a, b) => a.t - b.t)
  const objectives: Objective[] = events
    .filter((e): e is CoreEvent & { kind: Objective['kind'] } => e.kind !== 'kill')
    .map((e) => ({ t: e.t, kind: e.kind, sub: e.sub, team: e.team, lane: e.lane, killer: e.killer }))
    .sort((a, b) => a.t - b.t)
  const firstBloodBy = kills[0]?.killer ?? 0

  const teamKills = new Map<number, number>()
  const teamGold = new Map<number, number>()
  const teamDamage = new Map<number, number>()
  const add = (m: Map<number, number>, k: number, v: number) => m.set(k, (m.get(k) ?? 0) + (v || 0))
  for (const p of list) {
    add(teamKills, p.teamId, p.kills)
    add(teamGold, p.teamId, p.goldEarned)
    add(teamDamage, p.teamId, p.totalDamageDealtToChampions)
  }

  // Ranks from the scores: 1 = best of the game; MVP the best of the winning team, ACE of the other.
  const scores = opts.scores ?? {}
  const ranked = list.filter((p) => scores[p.puuid] !== undefined).sort((a, b) => scores[b.puuid] - scores[a.puuid])
  const remake = match.duration < REMAKE
  const mvp = remake ? undefined : ranked.find((p) => p.win)
  const ace = remake ? undefined : ranked.find((p) => !p.win)

  const players: PlayerView[] = list.map((p, i) => {
    const opp = laned ? laneOpponent(list, p) : undefined
    const j = opp ? list.indexOf(opp) : -1
    const lead15 = (rows: number[][]) => (at15 !== undefined && j >= 0 ? rows[i][at15] - rows[j][at15] : null)
    const first = frames.find((f) => f.puuid === p.puuid && f.perks?.keystone)?.perks
    const runes = first ? first.runes.filter((r) => r > 0) : []
    const keystone = first?.keystone || p.perks.keystone
    const perks = runes.length ? (runes[0] === keystone ? runes : [keystone, ...runes]).slice(0, 6) : keystone ? [keystone] : []
    const badges: Badge[] = []
    if (p === mvp) badges.push('mvp')
    else if (p === ace) badges.push('ace')
    for (const b of opts.badges?.[p.puuid] ?? []) if (BADGE_KEYS.has(b) && !badges.includes(b as Badge)) badges.push(b as Badge)
    if (hasEvents && firstBloodBy === pid(p) && !badges.includes('first_blood')) badges.push('first_blood')
    const score = remake ? undefined : scores[p.puuid]
    return {
      participantId: pid(p),
      teamId: p.teamId,
      win: p.win,
      puuid: p.puuid,
      gameName: p.gameName,
      tagLine: p.tagLine,
      championId: p.championId,
      level: p.champLevel || p.level,
      spells: p.spells,
      perks,
      styles: [first?.primaryStyle || p.perks.primary, first?.secondaryStyle || p.perks.sub],
      items: p.items,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kp: teamKills.get(p.teamId) ? (p.kills + p.assists) / teamKills.get(p.teamId)! : 0,
      cs: p.cs,
      csMin: p.cs / minutes,
      gold: p.goldEarned,
      goldShare: teamGold.get(p.teamId) ? p.goldEarned / teamGold.get(p.teamId)! : 0,
      damage: p.totalDamageDealtToChampions,
      physical: p.physicalDamageDealtToChampions,
      magic: p.magicDamageDealtToChampions,
      trueDamage: p.trueDamageDealtToChampions,
      damageShare: teamDamage.get(p.teamId) ? p.totalDamageDealtToChampions / teamDamage.get(p.teamId)! : 0,
      damageTaken: p.damageTaken,
      mitigated: null,
      healing: null,
      vision: p.visionScore,
      wardsPlaced: p.wardsPlaced,
      wardsKilled: p.wardsKilled,
      controlWards: p.visionWardsBoughtInGame,
      ccTime: null,
      objectiveDamage: p.damageDealtToObjectives,
      turretDamage: p.damageDealtToTurrets,
      doubles: null,
      triples: null,
      quadras: null,
      pentas: null,
      largestSpree: null,
      largestMulti: null,
      firstBlood: hasEvents && firstBloodBy === pid(p),
      position: laned ? (POSITION[p.position] ?? null) : null,
      opponent: opp ? pid(opp) : null,
      gold15: lead15(gold),
      xp15: lead15(xp),
      cs15: lead15(cs),
      score: score === undefined ? null : score / 10,
      rank: score === undefined ? 0 : ranked.indexOf(p) + 1,
      badges,
      augments: [],
      placement: 0,
    }
  })
  const byPid = new Map(players.map((p) => [p.participantId, p]))

  const blue = (teamId: number) => teamId === 100
  const field = (teamId: number, t1: number, t2: number) => (teamId === 100 ? t1 : teamId === 200 ? t2 : 0)
  const firstOf = (teamId: number, kind: Objective['kind']) => {
    if (!hasEvents) return null
    const o = objectives.find((x) => x.kind === kind)
    return !!o && o.team === teamId
  }
  const teamIds = [...new Set(list.map((p) => p.teamId))].sort((a, b) => a - b)
  const teams: TeamView[] = teamIds.map((teamId) => {
    const ps = players.filter((p) => p.teamId === teamId)
    const sum = (f: (p: PlayerView) => number) => ps.reduce((s, p) => s + f(p), 0)
    const taken = (kind: Objective['kind']) => objectives.filter((o) => o.kind === kind && o.team === teamId)
    return {
      teamId,
      win: ps.some((p) => p.win),
      bans: ((blue(teamId) ? match.t1Bans : teamId === 200 ? match.t2Bans : []) ?? []).filter((b) => b > 0),
      kills: sum((p) => p.kills),
      deaths: sum((p) => p.deaths),
      assists: sum((p) => p.assists),
      gold: sum((p) => p.gold),
      damage: sum((p) => p.damage),
      towers: field(teamId, match.t1Towers, match.t2Towers),
      inhibitors: field(teamId, match.t1Inhibs, match.t2Inhibs),
      dragons: field(teamId, match.t1Dragons, match.t2Dragons),
      barons: field(teamId, match.t1Barons, match.t2Barons),
      heralds: field(teamId, match.t1Heralds, match.t2Heralds),
      grubs: hasEvents ? taken('grubs').length : null,
      dragonTypes: taken('dragon').map((o) => o.sub),
      firstBlood: hasEvents ? byPid.get(firstBloodBy)?.teamId === teamId : null,
      firstTower: firstOf(teamId, 'tower'),
      firstDragon: firstOf(teamId, 'dragon'),
      firstBaron: firstOf(teamId, 'baron'),
      firstInhibitor: firstOf(teamId, 'inhibitor'),
    }
  })

  const sideDiff = (rows: number[][]) => times.map((_, k) => rows.reduce((s, row, i) => s + (list[i].teamId === 100 ? 1 : list[i].teamId === 200 ? -1 : 0) * row[k], 0))
  const timeline: TimelineView | null =
    times.length > 1
      ? { t: times.map((ms) => Math.round(ms / 1000)), gold, xp, cs, level, goldDiff: sideDiff(gold), xpDiff: sideDiff(xp), kills, objectives }
      : null

  return {
    gameId: gameIdOf(match.matchId),
    creation: match.gameStartMs,
    duration: match.duration,
    queueId: match.queueId,
    mapId: match.mapId,
    version: match.patch,
    remake,
    teams,
    players,
    timeline,
    fromCore: true,
  }
}

/** One player's game as a match row, from its detail (either source). Null when they are not in it. */
export function summaryOf(d: MatchDetail, puuid: string, matchId: string | null = null): MatchSummary | null {
  const p = d.players.find((x) => x.puuid === puuid)
  if (!p) return null
  const opp = d.players.find((x) => x.participantId === p.opponent)
  return {
    gameId: d.gameId,
    matchId,
    creation: d.creation,
    duration: d.duration,
    queueId: d.queueId,
    mapId: d.mapId,
    championId: p.championId,
    win: p.win,
    remake: d.remake,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs: p.cs,
    csMin: p.csMin,
    gold: p.gold,
    damage: p.damage,
    vision: p.vision,
    level: p.level,
    items: p.items,
    spells: p.spells,
    keystone: p.perks[0] ?? 0,
    primaryStyle: p.styles[0] ?? 0,
    subStyle: p.styles[1] ?? 0,
    lane: p.position,
    placement: p.placement,
    score:
      p.score === null
        ? null
        : {
            gameId: d.gameId,
            score: p.score,
            rank: p.rank,
            tag: p.badges.includes('mvp') ? 'mvp' : p.badges.includes('ace') ? 'ace' : '',
            opponent: opp?.championId ?? null,
            kp: p.kp,
            badges: p.badges.filter((b) => b !== 'mvp' && b !== 'ace'),
          },
  }
}

/** A rank as invade.lol serves it. Unknown losses stay 0, which the views read as "not known". */
export const rankFromCore = (r: CoreRank): Rank => ({
  tier: r.tier,
  division: ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(r.tier) ? '' : r.division,
  lp: r.leaguePoints,
  wins: r.wins,
  losses: r.losses ?? 0,
  provisional: false,
  previous: '',
})
