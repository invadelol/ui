<script setup lang="ts">
import { useFormat, useInvadeUi } from '../context'
import type { PlayedWith } from '../logic/types'
import Link from './Link.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * The people this player queues with: teammates seen in at least two of their latest full games.
 * A row links to that player's profile. Renders nothing until the host has the list.
 */
defineProps<{ data: PlayedWith | null }>()
const ui = useInvadeUi()
const { t } = ui
const { ago, num, pct } = useFormat()
</script>

<template>
  <section v-if="data && data.games" class="iv-panel iv-pf-panel iv-pf-mates">
    <header class="iv-panel-head">
      <h3>{{ t('Played with') }}</h3>
      <span class="meta">{{ t('Last {n} games', { n: num(data.games) }) }}</span>
    </header>
    <ul v-if="data.mates.length">
      <li v-for="m in data.mates" :key="m.puuid">
        <Link
          :to="{ kind: 'player', puuid: m.puuid, gameName: m.gameName, tagLine: m.tagLine }"
          :title="t('Open {name}’s profile', { name: `${m.gameName}#${m.tagLine}` })"
        >
          <img :src="ui.assetUrl('profileIcon', m.icon)" alt="" loading="lazy" />
          <span class="iv-pf-mate-who">
            <b>{{ m.gameName || t('Unknown player') }}<small v-if="m.tagLine">#{{ m.tagLine }}</small></b>
            <small>{{ t('{n} games', { n: num(m.games) }) }} · {{ ago(m.last) }}</small>
          </span>
          <span class="iv-pf-mate-wr">
            <b>{{ pct(m.wins / m.games) }}</b>
            <small>{{ t('{w}W {l}L', { w: m.wins, l: m.games - m.wins }) }}</small>
          </span>
        </Link>
      </li>
    </ul>
    <p v-else class="iv-pf-note">{{ t('No regular teammates in these games.') }}</p>
  </section>
</template>
