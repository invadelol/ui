<script setup lang="ts">
import { computed } from 'vue'
import { useFormat, useInvadeUi } from '../context'
import { count, positionName } from '../logic/labels'
import type { Position } from '../logic/types'
import RoleIcon from './RoleIcon.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/** Positions played on Summoner's Rift over the loaded games. A row filters the feed to that role. */
const props = defineProps<{ lanes: [Position, number][] }>()
const role = defineModel<Position | ''>('role', { required: true })
const { t } = useInvadeUi()
const { pct } = useFormat()

const rows = computed(() => {
  const total = props.lanes.reduce((s, [, n]) => s + n, 0)
  return props.lanes.map(([lane, n]) => ({ lane, n, share: total ? n / total : 0 }))
})
const pick = (lane: Position) => (role.value = role.value === lane ? '' : lane)
</script>

<template>
  <section v-if="rows.length" class="iv-panel iv-pf-panel iv-pf-roles">
    <header class="iv-panel-head">
      <h3>{{ t('Roles') }}</h3>
    </header>
    <ul>
      <li v-for="r in rows" :key="r.lane">
        <button type="button" :class="{ on: role === r.lane }" :title="t('Show only {role} games', { role: positionName(r.lane, t) })" @click="pick(r.lane)">
          <RoleIcon :lane="r.lane" />
          <span class="iv-pf-role-name">{{ positionName(r.lane, t) }}</span>
          <i class="iv-pf-share"><b :style="{ width: `${r.share * 100}%` }" /></i>
          <span class="iv-pf-role-n">{{ count(r.n, 'games', t) }}</span>
          <b class="iv-pf-role-pct">{{ pct(r.share) }}</b>
        </button>
      </li>
    </ul>
  </section>
</template>
