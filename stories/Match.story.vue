<script setup lang="ts">
import { MatchDetailPanel, MatchRow, MatchRowSkeleton } from '../src'
import { fromCoreMatch, type MatchSummary } from '../src/logic'
import { coreMatchOf } from './core'
import { detailOf, games } from './fixtures'

const remake: MatchSummary = { ...games[1], remake: true, win: false, duration: 160, kills: 0, deaths: 0, assists: 0, cs: 0, csMin: 0, items: [0, 0, 0, 0, 0, 0, 0], score: null }
const arena: MatchSummary = { ...games[3], queueId: 1700, placement: 2 }
const detail = detailOf(games[0])
const core = coreMatchOf(detail)
const fromCore = fromCoreMatch(core.match, { scores: core.scores })
</script>

<template>
  <Story title="Match" :layout="{ type: 'single', iframe: true }">
    <Variant title="Rows">
      <div class="story">
        <MatchRow v-for="(g, i) in games.slice(0, 6)" :key="g.gameId" :game="g" :score="g.score" :lp="i % 3 === 0 ? (g.win ? 19 : -21) : null" />
        <MatchRow :game="remake" />
        <MatchRow :game="arena" :score="arena.score" />
      </div>
    </Variant>

    <Variant title="Compact rows">
      <div class="story" style="max-width: 520px">
        <MatchRow v-for="g in games.slice(0, 5)" :key="g.gameId" :game="g" :score="g.score" compact />
      </div>
    </Variant>

    <Variant title="Rows loading">
      <div class="story"><MatchRowSkeleton :count="5" /></div>
    </Variant>

    <Variant title="Detail (desktop app game)">
      <div class="story">
        <MatchRow :game="games[0]" :score="games[0].score" open />
        <MatchDetailPanel :detail="detail" puuid="mock-self" />
      </div>
    </Variant>

    <Variant title="Detail (invade.lol game, fromCoreMatch)">
      <div class="story">
        <MatchDetailPanel :detail="fromCore" puuid="mock-self" :match-id="core.match.matchId" />
      </div>
    </Variant>

    <Variant title="Detail loading and failed">
      <div class="story">
        <MatchDetailPanel :detail="null" puuid="mock-self" />
        <MatchDetailPanel :detail="null" puuid="mock-self" error="Neither the League client nor invade.lol has the details of this game." />
      </div>
    </Variant>
  </Story>
</template>
