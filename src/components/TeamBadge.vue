<script setup lang="ts">
import { computed } from 'vue'
import { useInvadeUi } from '../context'
import { TEAM_RATINGS, teamTip, type TeamVerdict } from '../logic/team'
import Icon from './Icon.vue'
import '../styles/base.css'
import '../styles/primitives.css'

/**
 * How the player's teammates played (`teamRating`), as a badge beside the earned ones: good for
 * the player in the win colour, bad in the loss colour, stronger at either end, an average team
 * in plain ink. The tooltip says what the label means for this result.
 */
const props = defineProps<{ verdict: TeamVerdict; win: boolean }>()

const { t } = useInvadeUi()
const label = computed(() => t(TEAM_RATINGS[props.verdict.rating].label))
const tip = computed(() => teamTip(props.verdict, props.win, t))
</script>

<template>
  <span class="iv-badge iv-team" :class="verdict.rating" :title="tip" :aria-label="`${label}. ${tip}`">
    <Icon name="users" :size="11" />{{ label }}
  </span>
</template>

<style>
.iv-team svg {
  flex: none;
  opacity: 0.75;
}
.iv-team.great {
  color: var(--win);
  background: rgb(var(--win-rgb) / 0.18);
}
.iv-team.good {
  color: var(--win);
  background: rgb(var(--win-rgb) / 0.08);
}
.iv-team.bad {
  color: var(--loss);
  background: rgb(var(--loss-rgb) / 0.08);
}
.iv-team.poor {
  color: var(--loss);
  background: rgb(var(--loss-rgb) / 0.18);
}
</style>
