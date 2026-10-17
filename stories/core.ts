/**
 * A fixture game as invade.lol stores it, to show `fromCoreMatch` at work: the app-model fixture
 * written back into the website's shape (what its API serves), dropping what the website does not
 * keep (mitigated damage, healing, crowd control, sprees).
 */
import type { CoreEvent, CoreMatch, CoreTimelineEntry, FromCoreOptions, MatchDetail } from '../src/logic'

const RIOT = { TOP: 'TOP', JUNGLE: 'JUNGLE', MID: 'MIDDLE', ADC: 'BOTTOM', SUPPORT: 'UTILITY' } as const

export function coreMatchOf(d: MatchDetail): { match: CoreMatch; options: FromCoreOptions } {
  const team = (id: number) => d.teams.find((x) => x.teamId === id)!
  const [blue, red] = [team(100), team(200)]
  const tl = d.timeline
  const timeline: CoreTimelineEntry[] = tl
    ? d.players.flatMap((p, i) =>
        tl.t.map((sec, k) => ({
          participantId: p.participantId,
          puuid: p.puuid,
          teamId: p.teamId,
          frameMs: sec * 1000,
          level: tl.level[i][k],
          xp: tl.xp[i][k],
          goldTotal: tl.gold[i][k],
          cs: tl.cs[i][k],
          jungleCs: 0,
          perks: k ? undefined : { primaryStyle: p.styles[0], secondaryStyle: p.styles[1], keystone: p.perks[0], runes: p.perks, statPerks: { offense: 5005, flex: 5008, defense: 5011 } },
          skillOrder: p.skills,
        })),
      )
    : []
  const events: CoreEvent[] = tl
    ? [
        ...tl.kills.map((k) => ({ t: k.t, kind: 'kill' as const, sub: '', lane: '', team: d.players.find((p) => p.participantId === k.killer)?.teamId ?? 0, killer: k.killer, victim: k.victim, assists: k.assists, x: k.x, y: k.y })),
        ...tl.objectives.map((o) => ({ t: o.t, kind: o.kind, sub: o.sub, lane: o.lane, team: o.team, killer: o.killer, victim: 0, assists: [], x: 0, y: 0 })),
      ]
    : []
  const match: CoreMatch = {
    matchId: `EUW1_${d.gameId}`,
    gameStartMs: d.creation,
    duration: d.duration,
    queueId: d.queueId,
    mapId: d.mapId,
    patch: d.version.split('.').slice(0, 2).join('.'),
    t1Win: blue.win ? 1 : 0,
    t2Win: red.win ? 1 : 0,
    t1Towers: blue.towers,
    t2Towers: red.towers,
    t1Inhibs: blue.inhibitors,
    t2Inhibs: red.inhibitors,
    t1Dragons: blue.dragons,
    t2Dragons: red.dragons,
    t1Barons: blue.barons,
    t2Barons: red.barons,
    t1Heralds: blue.heralds,
    t2Heralds: red.heralds,
    t1Bans: blue.bans,
    t2Bans: red.bans,
    participants: d.players.map((p) => ({
      puuid: p.puuid,
      gameName: p.gameName,
      tagLine: p.tagLine,
      championId: p.championId,
      teamId: p.teamId,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs: p.cs,
      level: p.level,
      champLevel: p.level,
      items: p.items,
      spells: p.spells,
      perks: { primary: p.styles[0], sub: p.styles[1], keystone: p.perks[0] },
      visionScore: p.vision,
      damageTaken: p.damageTaken,
      totalDamageDealtToChampions: p.damage,
      physicalDamageDealtToChampions: p.physical,
      magicDamageDealtToChampions: p.magic,
      trueDamageDealtToChampions: p.trueDamage,
      damageDealtToObjectives: p.objectiveDamage,
      damageDealtToTurrets: p.turretDamage,
      visionWardsBoughtInGame: p.controlWards,
      position: p.position ? RIOT[p.position] : '',
      goldEarned: p.gold,
      wardsPlaced: p.wardsPlaced,
      wardsKilled: p.wardsKilled,
      neutralMinionsKilled: p.jungleCs,
      // Riot's games count pings; a few of each kind, the support's mostly vision ones.
      ...Object.fromEntries(['enemyMissing', 'onMyWay', 'danger', 'assist', 'allIn', 'push', 'getBack', 'command', 'needVision', 'enemyVision', 'visionCleared', 'bait', 'hold'].map((k, j) => [`${k}Pings`, (p.participantId * 7 + j * 5) % 9 > 4 ? ((p.participantId + j) % 6) + (p.position === 'SUPPORT' && j >= 8 ? 6 : 0) : 0])),
    })),
    timeline,
    events,
    shop: d.players.flatMap((p) => (p.purchases ?? []).map((b) => ({ t: b.t, player: p.participantId, item: b.item, sold: b.sold }))),
  }
  // invade.lol scores 0‥100 with their breakdown (its own `scoreLobby`); the fixture's stand in.
  const scored = d.players.filter((p) => p.score !== null)
  const scores = Object.fromEntries(scored.map((p) => [p.puuid, Math.round(p.score! * 10)]))
  const parts = Object.fromEntries(
    scored.map((p) => {
      const of = (f: (x: (typeof p.parts)[number]) => number) => Object.fromEntries(['fighting', 'damage', 'farming', 'vision', 'objectives'].map((k) => [k, f(p.parts.find((x) => x.key === k) ?? { key: 'vision', value: 0, weight: 0 })]))
      return [p.puuid, { categories: of((x) => x.value), weights: of((x) => x.weight) }]
    }),
  ) as FromCoreOptions['parts']
  return { match, options: { scores, parts } }
}
