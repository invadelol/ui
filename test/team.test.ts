import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'

// The library uses .js specifiers for consumers of its declarations; run its TS sources directly.
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes('/src/logic/') && specifier.startsWith('./') && specifier.endsWith('.js')) {
      return next(specifier.replace(/\.js$/, '.ts'), context)
    }
    return next(specifier, context)
  },
})
const { teamRating, teamTip, detailTeamRating, TEAM_RATINGS } = await import('../src/logic/team.ts')

const rift = (win: boolean) => ({ win, remake: false, mapId: 11 })
const rate = (win: boolean, ...mates: (number | null)[]) => teamRating(rift(win), mates)?.rating

test('no rating without four scored teammates', () => {
  assert.equal(teamRating({ win: true, remake: true, mapId: 11 }, [5, 5, 5, 5]), null)
  assert.equal(teamRating(rift(true), null), null)
  assert.equal(teamRating(rift(true), []), null)
  // Arena duos: one teammate.
  assert.equal(teamRating({ win: true, remake: false, mapId: 30 }, [6]), null)
})

test('a team is read against teams with the same result', () => {
  // A usual winning team (about 56 each on the score's 0–100 scale) and a usual losing one (~26).
  assert.equal(rate(true, 5.6, 5.6, 5.6, 5.6), 'average')
  assert.equal(rate(false, 2.6, 2.6, 2.6, 2.6), 'average')
  // The same four scores mean a bad team in a win and a good one in a loss: the result alone decides nothing.
  assert.equal(rate(true, 4.4, 4.4, 4.4, 4.4), 'poor')
  assert.equal(rate(false, 4.4, 4.4, 4.4, 4.4), 'great')
})

test('ratings rise with the teammates and cover five steps', () => {
  const order = ['poor', 'bad', 'average', 'good', 'great']
  let last = -1
  const seen = new Set<string>()
  for (let s = 0.5; s <= 9.5; s += 0.25) {
    const r = rate(false, s, s, s, s)!
    assert.ok(order.indexOf(r) >= last, `${s}: ${r}`)
    last = order.indexOf(r)
    seen.add(r)
  }
  assert.deepEqual([...seen].sort(), [...order].sort())
})

test('an AFK teammate makes a poor team', () => {
  assert.deepEqual(teamRating(rift(true), [9, 9, 9, null]), { rating: 'poor', afk: true })
  assert.match(teamTip({ rating: 'poor', afk: true }, true, (k) => k), /AFK/)
})

test('whole points, as both products show them: the app and the site agree', () => {
  // The app keeps scores unrounded (4.137), the site in whole points (4.1).
  for (const win of [true, false]) {
    const app = teamRating(rift(win), [4.137, 6.249, 2.951, 5.55])
    const site = teamRating(rift(win), [4.1, 6.2, 3.0, 5.6])
    assert.deepEqual(app, site)
  }
  // Scores at the ends of the scale stay finite.
  assert.equal(rate(true, 0, 10, 0, 10), 'bad')
})

test('ARAM and other maps have their own usual', () => {
  // Losing teams post better scores in ARAM than on the Rift.
  const mates = [3.7, 3.7, 3.7, 3.7]
  assert.equal(teamRating({ win: false, remake: false, mapId: 11 }, mates)?.rating, 'great')
  assert.equal(teamRating({ win: false, remake: false, mapId: 12 }, mates)?.rating, 'good')
})

test('every label has a tooltip for a win and a loss', () => {
  for (const r of Object.values(TEAM_RATINGS)) assert.ok(r.label && r.win && r.loss)
  const tip = teamTip({ rating: 'good', afk: false }, false, (k) => k)
  assert.equal(tip.split('\n').length, 2)
})

test('an opened game rates the viewed player’s teammates', () => {
  const player = (id: number, teamId: number, score: number | null, puuid = `p${id}`) => ({ participantId: id, teamId, win: teamId === 100, puuid, score })
  const players = [
    player(1, 100, 9.9, 'me'), player(2, 100, 5.6), player(3, 100, 5.6), player(4, 100, 5.6), player(5, 100, 5.6),
    player(6, 200, 1), player(7, 200, 1), player(8, 200, 1), player(9, 200, 1), player(10, 200, 1),
  ]
  const d = { remake: false, mapId: 11, players } as never
  assert.deepEqual(detailTeamRating(d, 'me'), { rating: 'average', afk: false })
  assert.deepEqual(detailTeamRating(d, 'p6'), { rating: 'poor', afk: false })
  assert.equal(detailTeamRating(d, 'nobody'), null)
})
