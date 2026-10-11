<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useFormat, useInvadeUi, useNames } from '../context'
import type { MatchSummary, ProfileView, ScoreRow } from '../logic/types'

/**
 * Champions over the loaded games (most played first), and the account's mastery as a second
 * view of the same panel. A row filters the feed to that champion; the selected one is lit.
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
  <section v-if="profile.champions.length || profile.card.mastery.length" class="iv-panel iv-pf-panel iv-pf-champs" :class="{ all }">
    <header class="iv-panel-head">
      <h3>{{ t('Champions') }}</h3>
      <div v-if="profile.card.mastery.length && profile.champions.length" class="iv-seg sm">
        <button type="button" :class="{ on: view === 'recent' }" @click="view = 'recent'">{{ t('Recent') }}</button>
        <button type="button" :class="{ on: view === 'mastery' }" @click="view = 'mastery'">{{ t('Mastery') }}</button>
      </div>
      <span v-else-if="view === 'mastery'" class="meta">{{ t('Mastery') }}</span>
    </header>

    <template v-if="view === 'recent'">
      <table class="iv-table iv-pf-table">
        <thead>
          <tr>
            <th>{{ t('Champion') }}</th>
            <th class="num">{{ t('Games') }}</th>
            <th class="num">{{ t('Win') }}</th>
            <th class="num iv-pf-col-opt">{{ t('KDA') }}</th>
            <th class="num iv-pf-col-cs">{{ t('CS/min') }}</th>
            <th class="num" :title="t('Average Invade score')">{{ t('Score') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in shownRows"
            :key="r.id"
            :class="{ self: champion === r.id }"
            :title="t('Show only {champion} games', { champion: champName(r.id) })"
            tabindex="0"
            @click="pick(r.id)"
            @keydown.enter.prevent="pick(r.id)"
          >
            <td>
              <span class="iv-pf-champ">
                <span class="iv-pf-portrait"><img :src="champIcon(r.id)" alt="" /></span>
                <b>{{ champName(r.id) }}</b>
              </span>
            </td>
            <td class="num">{{ r.games }}</td>
            <td class="num" :title="t('{w}W {l}L', { w: r.wins, l: r.games - r.wins })">{{ pct(r.wr) }}</td>
            <td class="num iv-pf-col-opt" :title="r.avg">{{ r.kda }}</td>
            <td class="num iv-pf-col-cs">{{ num(r.csMin, 1) }}</td>
            <td class="num">
              <template v-if="r.score !== null">{{ r.score }}</template>
              <span v-else class="iv-pf-dim">–</span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <table v-else class="iv-table iv-pf-table">
      <thead>
        <tr>
          <th>{{ t('Champion') }}</th>
          <th class="num iv-pf-col-opt">{{ t('Level') }}</th>
          <th class="num">{{ t('Points') }}</th>
          <th class="num">{{ t('Last played') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="m in mastery"
          :key="m.championId"
          :class="{ self: champion === m.championId }"
          tabindex="0"
          @click="pick(m.championId)"
          @keydown.enter.prevent="pick(m.championId)"
        >
          <td>
            <span class="iv-pf-champ">
              <span class="iv-pf-portrait"><img :src="champIcon(m.championId)" alt="" /></span>
              <b>{{ champName(m.championId) }}</b>
            </span>
          </td>
          <td class="num iv-pf-col-opt">{{ m.championLevel }}</td>
          <td class="num">{{ compact(m.championPoints) }}</td>
          <td class="num iv-pf-dim2">{{ m.lastPlayTime ? ago(m.lastPlayTime) : '–' }}</td>
        </tr>
      </tbody>
    </table>

    <button v-if="total > 3" type="button" class="iv-btn ghost sm iv-pf-more-rows" :class="{ few: total <= LIMIT }" @click="all = !all">
      {{ all ? t('Show less') : t('Show all {n}', { n: total }) }}
    </button>
  </section>
</template>
