<script setup lang="ts">
import '../styles/base.css'
import { computed } from 'vue'
import { useInvadeUi } from '../context'
import { BADGES, topBadges } from '../logic/labels'
import type { Badge } from '../logic/types'
import Icon, { type IconName } from './Icon.vue'
import StatIcon, { type StatIconName } from './StatIcon.vue'

/**
 * Earned tags of one player in one game: the rarest shown whole (glyph + name, violet hairline),
 * the others as small glyph tiles whose name is on hover. Rarest first (`topBadges` order), so the
 * one in front is the one worth telling. MVP / ACE live in the score column, not here.
 */
const props = withDefaults(defineProps<{ badges: readonly Badge[] | null | undefined; max?: number }>(), { max: 4 })
const { t } = useInvadeUi()

/** League's own stat glyphs where one fits, our line icons for the rest. */
const GLYPH: Partial<Record<Badge, { stat?: StatIconName; icon?: IconName }>> = {
  penta: { icon: 'zap' },
  quadra: { stat: 'kda' },
  triple: { stat: 'kda' },
  lane_won: { icon: 'trend' },
  carry_damage: { stat: 'damage' },
  deathless: { icon: 'shield' },
  first_blood: { icon: 'skull' },
  objectives: { icon: 'target' },
  vision: { stat: 'vision' },
  tank: { stat: 'taken' },
  cc: { icon: 'clock' },
}

const list = computed(() => topBadges(props.badges, props.max))
const lead = computed(() => list.value[0])
const rest = computed(() => list.value.slice(1))
</script>

<template>
  <span v-if="lead" class="iv-tags">
    <span class="iv-tag lead" :title="t(BADGES[lead].tip)">
      <StatIcon v-if="GLYPH[lead]?.stat" :name="GLYPH[lead]!.stat!" :size="12" />
      <Icon v-else-if="GLYPH[lead]?.icon" :name="GLYPH[lead]!.icon!" :size="12" />
      {{ t(BADGES[lead].label) }}
    </span>
    <span v-for="b in rest" :key="b" class="iv-tag tile" :title="t(BADGES[b].label) + ' · ' + t(BADGES[b].tip)" :aria-label="t(BADGES[b].label)">
      <StatIcon v-if="GLYPH[b]?.stat" :name="GLYPH[b]!.stat!" :size="11" />
      <Icon v-else-if="GLYPH[b]?.icon" :name="GLYPH[b]!.icon!" :size="11" />
    </span>
  </span>
</template>

<style>
.iv-tags {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
}
.iv-tag {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 18px;
  border-radius: var(--r-xs);
  background: var(--surface-3);
  color: var(--text-3);
}
.iv-tag.lead {
  position: relative;
  gap: 4px;
  padding: 0 7px 0 5px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-1);
}
.iv-tag.lead svg {
  color: var(--brand-hi);
}
/* The violet line, Invade's mark: a hairline under the tag that fades out. */
.iv-tag.lead::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1.5px;
  background: linear-gradient(90deg, var(--brand-hi), transparent);
}
.iv-tag.tile {
  justify-content: center;
  width: 18px;
  cursor: help;
}
.iv-tag.tile:hover {
  color: var(--text-1);
}
</style>
