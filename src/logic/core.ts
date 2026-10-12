/**
 * invade.lol → the shared model. The website stores matches in its own shape (`CoreMatch`, as its
 * API serves them); these adapters turn them into the `MatchDetail` / `MatchSummary` / `Rank` /
 * `ProfileView` / `PlayedWith` every view reads, so the website renders the same components as the
 * desktop app. Nothing is estimated: a value the stored match does not carry is `null` (or left
 * out), and views hide its row.
 */
import { PINGS, SCORE_CATEGORIES } from './detail.js'
import { rankValue } from './labels.js'
import type { Badge, ChampRow, ChampTotals, Kill, LpPoint, Mastery, MatchDetail, MatchSummary, Mate, Objective, Ping, PlayedWith, PlayerView, Position, ProfileView, Rank, ScoreCategory, TeamView, TimelineView } from './types.js'

// --- invade.lol's shapes (inertia/lib/types.ts), the fields read here --------------------------------

/** Pings per kind (`allInPings`…), on Riot's games. */
export type CorePings = Partial<Record<`${Ping}Pings`, number>>

export interface CoreParticipant extends CorePings {
  puuid: string
  gameName: string
  tagLine: string
  championId: number
  teamId: number
  /** ClickHouse's Bool arrives as 0 / 1. */
  win: boolean | number
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
  /** Jungle monsters among `cs`. */
  neutralMinionsKilled: number
  /** The icon the player had in this game, when stored. */
  profileIconId?: number
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
  perks?: {
    primaryStyle: number
    secondaryStyle: number
    keystone: number
    runes: number[]
    /** 0 when not recorded (games from the desktop app). */
    statPerks?: { offense: number; flex: number; defense: number }
  }
  /** Skill slots (1 Q … 4 R) in the order they were levelled, repeated on each frame. */
  skillOrder?: number[]
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
  /** Epoch ms; ClickHouse's UInt64 arrives as a string. */
  gameStartMs: number | string
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
  /** What a game from the desktop app could not report (`pings: false`: its zeros are not counts). */
  completeness?: { pings: boolean } | null
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

/** A row of the rank history: when it was read. */
export interface CoreRankSnapshot extends CoreRank {
  /** ISO date. */
  fetchedAt: string
}

export interface CoreSummoner {
  puuid: string
  gameName: string
  tagLine: string
  profileIconId: number | null
  summonerLevel: number | null
}

/** What invade.lol knows of a player: its summoner, ranks, mastery and the games loaded so far. */
export interface CoreProfile {
  summoner: CoreSummoner
  /** Current ranks per queue and every rank read, newest first. Null while unknown. */
  ranks: { current: CoreRank[]; history: CoreRankSnapshot[] } | null
  mastery: Mastery[]
  /** The loaded games, newest first (`summaryOf` each stored match). */
  games: MatchSummary[]
}

export interface FromCoreOptions {
  /** Invade score per puuid, 0‥100 (invade.lol's `lobbyScores`). Ranks, MVP and ACE follow from it. */
  scores?: Record<string, number>
  /** Earned badges per puuid (invade.lol's `earnedBadges` keys); unknown keys are dropped. */
  badges?: Record<string, readonly string[]>
  /** What each score is made of (invade.lol's `scoreLobby`): 0‥100 per category, and its weight in %. */
  parts?: Record<string, { categories: Record<ScoreCategory, number>; weights: Record<ScoreCategory, number> }>
}

const PING_KINDS = Object.keys(PINGS) as Ping[]
const POSITION: Record<string, Position> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MID', BOTTOM: 'ADC', UTILITY: 'SUPPORT' }
const BADGE_KEYS = new Set<string>(['carry_damage', 'tank', 'vision', 'cc', 'objectives', 'first_blood', 'triple', 'quadra', 'penta', 'deathless', 'lane_won'])
/** Below five minutes a game is a remake. */
const REMAKE = 300
const FRAME_15 = 15 * 60 * 1000

/** Riot's `teamPosition` (`MIDDLE`, `UTILITY`…) as a position; null in modes without lanes. */
export const positionOf = (riot: string | null | undefined): Position | null => POSITION[riot ?? ''] ?? null

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
  // A desktop game's pings are zeros it could not read, not counts.
  const pinged = match.completeness?.pings !== false && list.some((p) => p.allInPings !== undefined)

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
    const shards = first?.statPerks ? [first.statPerks.offense, first.statPerks.flex, first.statPerks.defense] : []
    const runes = first ? first.runes.filter((r) => r > 0) : []
    const keystone = first?.keystone || p.perks.keystone
    const perks = runes.length ? (runes[0] === keystone ? runes : [keystone, ...runes]).slice(0, 6) : keystone ? [keystone] : []
    const badges: Badge[] = []
    if (p === mvp) badges.push('mvp')
    else if (p === ace) badges.push('ace')
    for (const b of opts.badges?.[p.puuid] ?? []) if (BADGE_KEYS.has(b) && !badges.includes(b as Badge)) badges.push(b as Badge)
    if (hasEvents && firstBloodBy === pid(p) && !badges.includes('first_blood')) badges.push('first_blood')
    const score = remake ? undefined : scores[p.puuid]
    const parts = score === undefined ? undefined : opts.parts?.[p.puuid]
    return {
      participantId: pid(p),
      teamId: p.teamId,
      win: !!p.win,
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
      jungleCs: p.neutralMinionsKilled,
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
      parts: parts ? SCORE_CATEGORIES.filter((key) => parts.weights[key] > 0).map((key) => ({ key, value: parts.categories[key], weight: parts.weights[key] })) : [],
      rank: score === undefined ? 0 : ranked.indexOf(p) + 1,
      badges,
      skills: frames.find((f) => f.puuid === p.puuid && f.skillOrder?.length)?.skillOrder ?? [],
      augments: [],
      placement: 0,
      ...(shards.every(Boolean) ? { shards } : {}),
      ...(pinged ? { pings: Object.fromEntries(PING_KINDS.map((k) => [k, p[`${k}Pings`] ?? 0])) as Record<Ping, number> } : {}),
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
    creation: Number(match.gameStartMs),
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

const QUEUE_TYPES = { solo: 'RANKED_SOLO_5x5', flex: 'RANKED_FLEX_SR' } as const

/**
 * A profile as invade.lol knows it. Champions, roles and recent form are read from the loaded
 * games, as the app does (the table grows as older games load); the LP line from the stored rank
 * history. invade.lol has no signed-in viewer, so nobody is "you" here.
 */
export function profileFromCore({ summoner, ranks, mastery, games }: CoreProfile): ProfileView {
  const current = (queue: keyof typeof QUEUE_TYPES) => {
    const r = ranks?.current.find((x) => x.queueType === QUEUE_TYPES[queue] && x.tier)
    return r ? rankFromCore(r) : null
  }
  const played = games.filter((g) => !g.remake)

  const byChampion = new Map<number, ChampRow>()
  const lanes = new Map<Position, number>()
  for (const g of played) {
    const c = byChampion.get(g.championId) ?? { championId: g.championId, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, seconds: 0, damage: 0, gold: 0, vision: 0 }
    c.games++
    if (g.win) c.wins++
    c.kills += g.kills
    c.deaths += g.deaths
    c.assists += g.assists
    c.cs += g.cs
    c.seconds += g.duration
    c.damage += g.damage
    c.gold += g.gold
    c.vision += g.vision
    byChampion.set(g.championId, c)
    if (g.lane) lanes.set(g.lane, (lanes.get(g.lane) ?? 0) + 1)
  }
  const champions = [...byChampion.values()].sort((a, b) => b.games - a.games || b.wins - a.wins)
  const totals = (list: ChampRow[]) => {
    const sum = (f: (c: ChampRow) => number) => list.reduce((s, c) => s + f(c), 0)
    return { games: sum((c) => c.games), wins: sum((c) => c.wins), kills: sum((c) => c.kills), deaths: sum((c) => c.deaths), assists: sum((c) => c.assists), cs: sum((c) => c.cs), seconds: sum((c) => c.seconds) }
  }
  const results = played.map((g) => g.win)
  const run = results.findIndex((w) => w !== results[0])
  const streak = results.length ? (run < 0 ? results.length : run) * (results[0] ? 1 : -1) : 0
  const byLane = [...lanes].sort((a, b) => b[1] - a[1])

  const lp: LpPoint[] = (ranks?.history ?? [])
    .flatMap((r) => {
      const queue = r.queueType === QUEUE_TYPES.solo ? 'solo' : r.queueType === QUEUE_TYPES.flex ? 'flex' : null
      const rank = rankFromCore(r)
      const value = rankValue(rank)
      const t = Date.parse(r.fetchedAt)
      return queue && value !== null && t ? [{ t, queue, tier: rank.tier, division: rank.division, lp: rank.lp, wins: rank.wins, losses: rank.losses, value: Math.round(value * 100) } as LpPoint] : []
    })
    .sort((a, b) => a.t - b.t)

  return {
    card: {
      puuid: summoner.puuid,
      gameName: summoner.gameName,
      tagLine: summoner.tagLine,
      icon: summoner.profileIconId ?? 0,
      level: summoner.summonerLevel ?? 0,
      private: false,
      solo: current('solo'),
      flex: current('flex'),
      recent: {
        ...totals(champions),
        results,
        streak,
        lanes: byLane,
        champions: champions.map((c): ChampTotals => ({ championId: c.championId, games: c.games, wins: c.wins, kills: c.kills, deaths: c.deaths, assists: c.assists, cs: c.cs, seconds: c.seconds })),
        ranked: played.filter((g) => g.queueId === 420).length,
      },
      mastery: [...mastery].sort((a, b) => b.championPoints - a.championPoints),
      offline: false,
    },
    isSelf: false,
    isOwn: false,
    champions,
    lanes: byLane,
    lp,
  }
}

/**
 * The people a player queues with, from their loaded games: teammates seen in at least two of the
 * latest 40 full games, the eight most frequent (the desktop app's rule). Names and icons are the
 * ones of the last game together.
 */
export function playedWithFromCore(matches: readonly CoreMatch[], puuid: string): PlayedWith {
  const mates = new Map<string, Mate>()
  const full = matches.filter((m) => m.duration >= REMAKE && m.participants.some((p) => p.puuid === puuid))
  const recent = [...full].sort((a, b) => Number(b.gameStartMs) - Number(a.gameStartMs)).slice(0, 40)
  for (const m of recent) {
    const team = m.participants.find((p) => p.puuid === puuid)!.teamId
    for (const p of m.participants) {
      if (!p.puuid || p.puuid === puuid || p.teamId !== team) continue
      const mate = mates.get(p.puuid) ?? { puuid: p.puuid, gameName: p.gameName, tagLine: p.tagLine, icon: p.profileIconId ?? 0, games: 0, wins: 0, last: Number(m.gameStartMs) }
      mate.games++
      if (p.win) mate.wins++
      mates.set(p.puuid, mate)
    }
  }
  return {
    mates: [...mates.values()].filter((m) => m.games >= 2).sort((a, b) => b.games - a.games || b.last - a.last).slice(0, 8),
    games: recent.length,
  }
}
