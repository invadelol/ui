<script setup lang="ts">
import Icon from './Icon.vue'
import { useInvadeUi } from '../context'
import '../styles/base.css'

/** A star that saves something to favorites: a ghost icon button, gold once saved. `label` names what it saves. */
defineProps<{ saved: boolean; label: string }>()
defineEmits<{ toggle: [] }>()
const { t } = useInvadeUi()
</script>

<template>
  <button
    type="button"
    class="iv-star"
    :class="{ saved }"
    :aria-pressed="saved"
    :aria-label="`${t(saved ? 'Remove from favorites' : 'Save to favorites')} · ${label}`"
    :title="t(saved ? 'Remove from favorites' : 'Save to favorites')"
    @click.stop="$emit('toggle')"
  >
    <Icon name="star" :size="16" />
  </button>
</template>

<style>
.iv-star {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  color: var(--text-3);
  background: transparent;
  border: 0;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: color var(--t-fast), background-color var(--t-fast);
}
.iv-star:hover {
  color: var(--text-1);
  background: var(--surface-2);
}
.iv-star.saved {
  color: var(--gold-c);
}
.iv-star.saved svg {
  fill: rgb(var(--gold-rgb) / 0.3);
}
</style>
