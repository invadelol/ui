<script setup lang="ts">
import { computed } from 'vue'
import { useNames } from '../context'
import '../styles/base.css'

/**
 * A champion portrait (square art), cropped slightly so Riot's baked border disappears. `level`
 * draws the small level badge bottom-right; `dim` is for bans. An unknown champion renders an
 * empty well of the same size.
 */
const props = withDefaults(defineProps<{ id?: number | null; size?: number; level?: number | null; dim?: boolean; title?: string }>(), {
  id: null,
  size: 28,
  level: null,
  dim: false,
  title: undefined,
})
const { champIcon, champName } = useNames()
const src = computed(() => (props.id ? champIcon(props.id) : undefined))
const label = computed(() => props.title ?? (props.id ? champName(props.id) : undefined))
</script>

<template>
  <span class="iv-champ" :class="{ dim, empty: !src }" :style="{ width: `${size}px`, height: `${size}px` }" :title="label">
    <img v-if="src" :src="src" alt="" loading="lazy" draggable="false" />
    <em v-if="level">{{ level }}</em>
  </span>
</template>

<style>
.iv-champ {
  position: relative;
  display: inline-block;
  flex: none;
  overflow: hidden;
  vertical-align: middle;
  background: var(--well);
  border-radius: var(--r-sm);
}
.iv-champ > img {
  display: block;
  width: 100%;
  height: 100%;
  transform: scale(1.08);
}
.iv-champ.dim > img {
  opacity: 0.45;
  filter: grayscale(1);
}
.iv-champ > em {
  position: absolute;
  right: 0;
  bottom: 0;
  min-width: 15px;
  height: 14px;
  padding: 0 3px;
  font: 600 10px/14px var(--font);
  font-style: normal;
  text-align: center;
  color: var(--text-1);
  background: var(--solid-1);
  border-top-left-radius: var(--r-xs);
}
</style>
