<script setup lang="ts">
import { computed } from 'vue'
import { useInvadeUi } from '../context'
import '../styles/base.css'

/**
 * Riot's ranked crest for a tier. Small sizes use the flat mini crests bundled with the package
 * (sharp at 12–28px, offline); from 40px up the full emblem from the host (`assetUrl('rank', tier)`),
 * which falls back to the mini crest if it cannot load. A host without one gets the mini crest.
 */
const props = withDefaults(defineProps<{ tier?: string | null; size?: number }>(), { tier: null, size: 20 })
const ui = useInvadeUi()

const MINI = import.meta.glob<string>('../assets/ranks/*.svg', { eager: true, query: '?url', import: 'default' })
const id = computed(() => (props.tier ?? '').toLowerCase().replace(/[^a-z]/g, '') || 'unranked')
const mini = computed(() => MINI[`../assets/ranks/${id.value}.svg`] ?? MINI['../assets/ranks/unranked.svg'])
const emblem = computed(() => (props.size >= 40 && id.value !== 'unranked' ? ui.assetUrl('rank', id.value) : undefined))

function fallback(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.src !== mini.value) img.src = mini.value
}
</script>

<template>
  <!-- The full emblem is a 1280×720 frame with the crest in its middle third: the image is drawn
       larger than its box and centred on the crest, so `size` is the crest's size. -->
  <span v-if="emblem" class="iv-crest big" :style="{ width: `${size}px`, height: `${size}px` }">
    <img :src="emblem" :style="{ width: `${Math.round(size * 4.1)}px` }" alt="" draggable="false" @error="fallback" />
  </span>
  <img v-else class="iv-crest" :src="mini" :width="size" :height="Math.round(size * 0.76)" alt="" draggable="false" />
</template>

<style>
.iv-crest {
  display: block;
  flex: none;
  object-fit: contain;
}
img.iv-crest {
  height: auto;
  aspect-ratio: 1 / 0.76;
}
.iv-crest.big {
  position: relative;
  overflow: visible;
}
.iv-crest.big img {
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: none;
  height: auto;
  transform: translate(-50%, -47%);
  pointer-events: none;
}
/* Fallback: the mini crest fills the box. */
.iv-crest.big img[src$='.svg'],
.iv-crest.big img[src^='data:'] {
  width: 100% !important;
  transform: translate(-50%, -50%);
}
</style>
