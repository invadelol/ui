<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useFormat, useInvadeUi, useNames } from '../context'
import { count } from '../logic/labels'
import type { MatchSummary, ProfileView, ScoreRow } from '../logic/types'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * Champions over the loaded games (most played first), and the account's mastery as a second view
 * of the same section. On the page ground like invade.lol's rail: a row per champion with its
 * picture, a meta line (games, KDA, average Invade score) and its win rate. A row filters the feed
 * to that champion; the selected one is lit.
 */
const props = defineProps<{ profile: ProfileView; games: MatchSummary[]; scores: ReadonlyMap<number, ScoreRow> }>()
const champion = defineModel<number>('champion', { required: true })
const { t } = useInvadeUi()
const { ago, compact, kdaRatio, num, pct, score100 } = useFormat()
const { champIcon, champName } = useNames()

/** Mastery first when there are no recent games to sum up (private or empty history). */
const view = shallowRef<'recent' | 'mastery'>(props.profile.champions.length || !props.profile.card.mastery.length ? 'recent' : 'mastery')
const all = shallowRef(false)
const LIMIT = 6

const rows = computed(() => {
  // Average Invade score per champion over the games that have one.
  const sums = new Map<number, [number, number]>()
  for (const g of props.games) {
    const s = props.scores.get(g.gameId)
    if (!s) continue
    const acc = sums.get(g.championId) ?? [0, 0]
    sums.set(g.championId, [acc[0] + s.score, acc[1] + 1])
  }
  return props.profile.champions.map((c) => {
    const sc = sums.get(c.championId)
    const g = Math.max(1, c.games)
    return {
      id: c.championId,
      games: c.games,
      wins: c.wins,
      wr: c.games ? c.wins / c.games : 0,
      kda: kdaRatio(c.kills, c.deaths, c.assists),
      avg: `${num(c.kills / g, 1)} / ${num(c.deaths / g, 1)} / ${num(c.assists / g, 1)}`,
      csMin: c.cs / Math.max(1, c.seconds / 60),
      score: sc ? score100(sc[0] / sc[1]) : null,
    }
  })
})
const shownRows = computed(() => (all.value ? rows.value : rows.value.slice(0, LIMIT)))
const mastery = computed(() => props.profile.card.mastery.slice(0, all.value ? 20 : LIMIT))
const total = computed(() => (view.value === 'recent' ? rows.value.length : Math.min(20, props.profile.card.mastery.length)))
const pick = (id: number) => (champion.value = champion.value === id ? 0 : id)
</script>

<template>
  <section v-if="profile.champions.length || profile.card.mastery.length" class="iv-pf-ground iv-pf-champs" :class="{ all }">
    <header class="iv-pf-ground-head">
      <h3>{{ t('Champions') }}</h3>
      <div v-if="profile.card.mastery.length && profile.champions.length" class="iv-seg sm">
        <button type="button" :class="{ on: view === 'recent' }" @click="view = 'recent'">{{ t('Recent') }}</button>
        <button type="button" :class="{ on: view === 'mastery' }" @click="view = 'mastery'">{{ t('Mastery') }}</button>
      </div>
      <span v-else-if="view === 'mastery'" class="meta">{{ t('Mastery') }}</span>
    </header>

    <ul v-if="view === 'recent'" class="iv-pf-rows">
      <li v-for="r in shownRows" :key="r.id">
        <button type="button" class="iv-pf-row" :class="{ on: champion === r.id }" :aria-pressed="champion === r.id" :title="t('Show only {champion} games', { champion: champName(r.id) })" @click="pick(r.id)">
          <span class="iv-pf-pic"><img :src="champIcon(r.id)" alt="" loading="lazy" /></span>
          <span class="iv-pf-row-t">
            <b>{{ champName(r.id) }}</b>
            <small :title="r.avg">{{ count(r.games, 'games', t) }} · {{ r.kda }} {{ t('KDA') }}<template v-if="r.score !== null"> · {{ t('score {s}', { s: r.score }) }}</template></small>
          </span>
          <span class="iv-pf-row-v">
            <b>{{ pct(r.wr) }}</b>
            <small>{{ t('{w}W {l}L', { w: r.wins, l: r.games - r.wins }) }}</small>
          </span>
        </button>
      </li>
    </ul>

    <ul v-else class="iv-pf-rows">
      <li v-for="m in mastery" :key="m.championId">
        <button type="button" class="iv-pf-row" :class="{ on: champion === m.championId }" :aria-pressed="champion === m.championId" :title="t('Show only {champion} games', { champion: champName(m.championId) })" @click="pick(m.championId)">
          <span class="iv-pf-pic"><img :src="champIcon(m.championId)" alt="" loading="lazy" /></span>
          <span class="iv-pf-row-t">
            <b>{{ champName(m.championId) }}</b>
            <small>{{ t('Level {n}', { n: m.championLevel }) }}<template v-if="m.lastPlayTime"> · {{ ago(m.lastPlayTime) }}</template></small>
          </span>
          <span class="iv-pf-row-v">
            <b>{{ compact(m.championPoints) }}</b>
            <small>{{ t('pts') }}</small>
          </span>
        </button>
      </li>
    </ul>

    <button v-if="total > 3" type="button" class="iv-btn ghost sm iv-pf-more-rows" :class="{ few: total <= LIMIT }" @click="all = !all">
      {{ all ? t('Show less') : t('Show all {n}', { n: total }) }}
    </button>
  </section>
</template>
