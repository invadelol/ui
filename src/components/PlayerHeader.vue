<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { useFormat, useInvadeUi } from '../context'
import { count, positionName, rankLabel, tierColor, tierRgb } from '../logic/labels'
import { tk } from '../logic/i18n'
import type { MatchSummary, Position, ProfileView, Rank } from '../logic/types'
import Icon from './Icon.vue'
import RankCrest from './RankCrest.vue'
import RoleIcon from './RoleIcon.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * The player's plate: who they are and where they stand, the page's first and heaviest block.
 * The icon with its level as a key under it, the Riot ID (copied in one click), a few chips (You,
 * the main role, the host's badges) and the last game; then the rank as an object: its emblem
 * standing in its tier's light, the tier and the LP as figures, the record and the ladder place
 * (`standing`, written by the host), the other queue on one line. The main champion's splash fills
 * the band's right end, beyond the text, faded into the sheet.
 */
const props = defineProps<{
  profile: ProfileView
  games: MatchSummary[]
  /** Extra neutral badges after the chips, from the host (a role the player holds there). */
  badges?: string[]
  /** Where the player stands on their server's ladder, as the host writes it ("#1,204 · top 2%"). */
  standing?: string | null
}>()
const ui = useInvadeUi()
const { t } = ui
const { ago, num, pct } = useFormat()

const card = computed(() => props.profile.card)
const solo = computed(() => card.value.solo)
const flex = computed(() => card.value.flex)
/** Last game: the newest loaded game's end. */
const lastGame = computed(() => {
  const g = props.games[0]
  return g ? ago(Math.min(Date.now(), g.creation + g.duration * 1000)) : ''
})
/** The role of most of the loaded Summoner's Rift games. */
const mainRole = computed<Position | null>(() => {
  const lanes = props.profile.lanes
  const total = lanes.reduce((s, [, n]) => s + n, 0)
  const top = [...lanes].sort((a, b) => b[1] - a[1])[0]
  return top && total >= 3 && top[1] / total >= 0.4 ? top[0] : null
})
const splash = computed(() => {
  const id = props.profile.champions[0]?.championId ?? card.value.mastery[0]?.championId
  return id ? ui.assetUrl('splash', id) : undefined
})
/** The rank shown large: Solo/Duo, or Flex when only Flex is ranked; the other queue is one line under it. */
const hero = computed(() =>
  solo.value || !flex.value ? { rank: solo.value, label: tk('Ranked Solo/Duo') } : { rank: flex.value, label: tk('Ranked Flex') },
)
const second = computed(() => (solo.value && flex.value ? flex.value : null))
/** That tier's colour as an "r g b" triple: its light behind the emblem. */
const light = computed(() => tierRgb(hero.value.rank?.tier))
const lastSeason = (r: Rank | null) => (r?.previous ? t('Last season: {tier}', { tier: rankLabel({ ...r, tier: r.previous, division: '' }, false, t) }) : undefined)
/** The client reports 0 losses for other players (hidden): no fake 100% win rate then. */
const known = (r: Rank) => r.losses > 0

const copied = shallowRef(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  try {
    await navigator.clipboard?.writeText(`${card.value.gameName}#${card.value.tagLine}`)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 1400)
  } catch {
    /* no clipboard: nothing to say */
  }
}
onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<template>
  <section class="iv-pf-head" :class="{ lit: !!light }" :style="light ? { '--iv-pf-tier': light } : undefined">
    <img v-if="splash" class="iv-pf-splash" :src="splash" alt="" loading="lazy" decoding="async" />

    <div class="iv-pf-id">
      <span class="iv-pf-icon" :title="t('Level {n}', { n: card.level })">
        <img :src="ui.assetUrl('profileIcon', card.icon)" alt="" />
        <b>{{ num(card.level) }}</b>
      </span>
      <div class="iv-pf-who">
        <h2>
          <span class="iv-pf-name">{{ card.gameName }}</span><small>#{{ card.tagLine }}</small>
          <button type="button" class="iv-pf-copy" :title="copied ? t('Copied') : t('Copy')" :aria-label="copied ? t('Copied') : t('Copy')" @click="copy">
            <Icon :name="copied ? 'check' : 'copy'" :size="14" />
          </button>
        </h2>
        <p class="iv-pf-chips">
          <span v-if="profile.isSelf" class="iv-pf-chip brand">{{ t('You') }}</span>
          <span v-else-if="profile.isOwn" class="iv-pf-chip brand">{{ t('Your account') }}</span>
          <span v-if="mainRole" class="iv-pf-chip"><RoleIcon :lane="mainRole" :size="14" />{{ positionName(mainRole, t) }}</span>
          <span v-for="b in badges" :key="b" class="iv-pf-chip">{{ b }}</span>
          <span v-if="card.private" class="iv-pf-chip"><Icon name="eye" :size="13" />{{ t('Private profile') }}</span>
        </p>
        <p v-if="lastGame" class="iv-pf-meta">{{ t('Last game {when}', { when: lastGame }) }}</p>
      </div>
    </div>

    <div class="iv-pf-rank" :class="{ none: !hero.rank }" :title="lastSeason(hero.rank)">
      <span class="iv-pf-emb"><RankCrest :tier="hero.rank?.tier" :size="hero.rank ? 72 : 36" emblem /></span>
      <div class="iv-pf-rank-t">
        <small>{{ t(hero.label) }}</small>
        <p v-if="hero.rank">
          <b class="iv-pf-tier" :style="{ color: tierColor(hero.rank.tier) }">{{ rankLabel(hero.rank, false, t) }}</b>
          <span class="iv-pf-lp">{{ num(hero.rank.lp) }}<span class="iv-unit">{{ t('LP') }}</span></span>
        </p>
        <p v-else><b class="iv-pf-tier iv-pf-unranked">{{ t('Unranked') }}</b></p>
        <span v-if="hero.rank" class="iv-pf-rec">
          <template v-if="known(hero.rank)"><b class="w">{{ num(hero.rank.wins) }}{{ t('W') }}</b> <b class="l">{{ num(hero.rank.losses) }}{{ t('L') }}</b> · {{ pct(hero.rank.wins / Math.max(1, hero.rank.wins + hero.rank.losses)) }}</template>
          <template v-else>{{ count(hero.rank.wins, 'wins', t) }}</template>
          <template v-if="hero.rank === solo && standing"> · <span class="iv-pf-standing">{{ standing }}</span></template>
        </span>
        <span v-if="second" class="iv-pf-flex" :title="lastSeason(second)">
          {{ t('Flex') }}<RankCrest :tier="second.tier" :size="16" /><b :style="{ color: tierColor(second.tier) }">{{ rankLabel(second, false, t) }}</b>
          <span>{{ num(second.lp) }} {{ t('LP') }}<template v-if="known(second)"> · {{ t('{w}W {l}L', { w: second.wins, l: second.losses }) }}</template></span>
        </span>
      </div>
    </div>
  </section>
</template>
