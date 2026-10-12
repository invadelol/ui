<script setup lang="ts">
import { computed } from 'vue'
import { useFormat, useInvadeUi } from '../context'
import { count, rankLabel, tierColor } from '../logic/labels'
import type { MatchSummary, ProfileView, Rank } from '../logic/types'
import Icon from './Icon.vue'
import RankCrest from './RankCrest.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * Who the player is and where they stand, in one band: icon, Riot ID, level and last game, and
 * both ranks with Riot's crest. The splash of their most played champion sits behind the right
 * half of the band only, faded with straight masks.
 */
const props = defineProps<{ profile: ProfileView; games: MatchSummary[] }>()
const ui = useInvadeUi()
const { t } = ui
const { ago, pct } = useFormat()

const card = computed(() => props.profile.card)
const ranks = computed(() =>
  [
    { id: 'solo', label: t('Solo/Duo'), rank: card.value.solo },
    { id: 'flex', label: t('Flex'), rank: card.value.flex },
  ] as { id: string; label: string; rank: Rank | null }[],
)
/** Last game: the newest loaded game's end. */
const lastGame = computed(() => {
  const g = props.games[0]
  return g ? ago(Math.min(Date.now(), g.creation + g.duration * 1000)) : ''
})
const splash = computed(() => {
  const id = props.profile.champions[0]?.championId ?? card.value.mastery[0]?.championId
  return id ? ui.assetUrl('splash', id) : undefined
})
const lastSeason = (r: Rank | null) => (r?.previous ? t('Last season: {tier}', { tier: rankLabel({ ...r, tier: r.previous, division: '' }, false, t) }) : undefined)
</script>

<template>
  <section class="iv-pf-head">
    <img v-if="splash" class="iv-pf-splash" :src="splash" alt="" loading="lazy" decoding="async" />
    <img class="iv-pf-icon" :src="ui.assetUrl('profileIcon', card.icon)" alt="" />
    <div class="iv-pf-who">
      <h2>
        <span class="iv-pf-name">{{ card.gameName }}</span><small>#{{ card.tagLine }}</small>
        <span v-if="profile.isSelf" class="iv-badge brand">{{ t('You') }}</span>
        <span v-else-if="profile.isOwn" class="iv-badge brand">{{ t('Your account') }}</span>
      </h2>
      <p class="iv-pf-meta">
        <span>{{ t('Level {n}', { n: card.level }) }}</span>
        <span v-if="lastGame">{{ t('Last game {when}', { when: lastGame }) }}</span>
        <span v-if="card.private" class="iv-pf-flag"><Icon name="eye" :size="12" />{{ t('Private profile') }}</span>
      </p>
    </div>

    <div class="iv-pf-ranks">
      <div v-for="r in ranks" :key="r.id" class="iv-pf-rank" :class="{ none: !r.rank }" :title="lastSeason(r.rank)">
        <RankCrest :tier="r.rank?.tier" :size="r.rank ? 40 : 28" />
        <div>
          <p>
            <b v-if="r.rank" :style="{ color: tierColor(r.rank.tier) }">{{ rankLabel(r.rank, false, t) }}</b>
            <b v-else class="iv-pf-unranked">{{ t('Unranked') }}</b>
            <span v-if="r.rank" class="iv-pf-lp">{{ r.rank.lp }}<span class="iv-unit">{{ t('LP') }}</span></span>
          </p>
          <small>
            {{ r.label }}
            <!-- The client reports 0 losses for other players (hidden): no fake 100% win rate. -->
            <template v-if="r.rank && r.rank.losses"> · {{ t('{w}W {l}L', { w: r.rank.wins, l: r.rank.losses }) }} · {{ pct(r.rank.wins / Math.max(1, r.rank.wins + r.rank.losses)) }}</template>
            <template v-else-if="r.rank"> · {{ count(r.rank.wins, 'wins', t) }}</template>
          </small>
        </div>
      </div>
    </div>
  </section>
</template>
