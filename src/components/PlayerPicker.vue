<script setup lang="ts">
import { computed } from 'vue'
import { useInvadeUi, useNames } from '../context'
import { positionName } from '../logic/labels'
import type { MatchDetail, PlayerView } from '../logic/types'
import '../styles/base.css'
import '../styles/detail.css'

/** Picks the player a detail tab is about: the viewed player's team first, the other after a gap. */
const props = defineProps<{ detail: MatchDetail; selected: number; me?: PlayerView }>()
const emit = defineEmits<{ select: [index: number] }>()
const { t } = useInvadeUi()
const { champIcon, champName } = useNames()

const groups = computed(() => {
  const ps = props.detail.players.map((p, i) => ({ p, i }))
  const mine = props.me?.teamId ?? ps[0]?.p.teamId
  return [ps.filter((x) => x.p.teamId === mine), ps.filter((x) => x.p.teamId !== mine)].filter((g) => g.length)
})
const focus = computed(() => props.detail.players[props.selected])
</script>

<template>
  <div class="iv-pp">
    <div class="iv-pp-row">
      <span v-for="(g, k) in groups" :key="k" class="iv-pp-team" :class="k ? 'enemy' : 'ally'">
        <button
          v-for="{ p, i } in g"
          :key="p.participantId"
          type="button"
          :class="{ on: i === selected }"
          :title="`${p.gameName || champName(p.championId)} · ${champName(p.championId)}`"
          :aria-pressed="i === selected"
          @click="emit('select', i)"
        >
          <img :src="champIcon(p.championId)" alt="" />
        </button>
      </span>
    </div>
    <p v-if="focus" class="iv-pp-name">
      <b>{{ focus.gameName || champName(focus.championId) }}</b>
      <small>{{ champName(focus.championId) }}<template v-if="focus.position"> · {{ positionName(focus.position, t) }}</template></small>
    </p>
  </div>
</template>
