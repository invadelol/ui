<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useInvadeUi } from '../context'
import '../styles/base.css'

/**
 * Riot's ranked crest for a tier: the flat mini crest bundled with the package (sharp at any size,
 * offline), or with `emblem` the full emblem from the host (`assetUrl('rank', tier)`) for the few
 * places designed around it. The emblem is a 1280×720 frame whose wings reach far past the crest,
 * so it gets a box of its own, wider than tall and faded at the edges, never over the text beside
 * it. An image that fails or is not that frame (a proxy placeholder) leaves the mini crest.
 * `size` is the crest's size; a host may override the emblem's with `--iv-crest`.
 */
const props = withDefaults(defineProps<{ tier?: string | null; size?: number; emblem?: boolean }>(), { tier: null, size: 20 })
const ui = useInvadeUi()

const MINI = import.meta.glob<string>('../assets/ranks/*.svg', { eager: true, query: '?url', import: 'default' })
const id = computed(() => (props.tier ?? '').toLowerCase().replace(/[^a-z]/g, '') || 'unranked')
const mini = computed(() => MINI[`../assets/ranks/${id.value}.svg`] ?? MINI['../assets/ranks/unranked.svg'])
const src = computed(() => (props.emblem && id.value !== 'unranked' ? ui.assetUrl('rank', id.value) : undefined))

/** null while loading, then whether the image is the 16:9 frame. */
const ok = shallowRef<boolean | null>(null)
watch(src, () => (ok.value = null))
const img = useTemplateRef<HTMLImageElement>('img')
const check = () => {
  const i = img.value
  if (i?.naturalWidth) ok.value = i.naturalWidth >= i.naturalHeight * 1.5
}
// Loaded before hydration (a server-rendered page): no load event comes.
onMounted(() => img.value?.complete && check())
</script>

<template>
  <span v-if="src" class="iv-crest big" :class="{ ok }" :style="{ '--iv-size': `${size}px` }">
    <img v-if="ok !== false" ref="img" :src="src" alt="" draggable="false" @load="check" @error="ok = false" />
    <img v-else class="mini" :src="mini" alt="" draggable="false" />
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
  display: grid;
  place-items: center;
  --iv-s: var(--iv-crest, var(--iv-size));
  width: calc(var(--iv-s) * 1.75);
  height: var(--iv-s);
}
/* The crest is the middle of the frame: the image is drawn 4.1× the crest and centred on it, and
   an ellipse as wide as the box (a little taller, for crowns) fades the wings out inside it. */
.iv-crest.big img:not(.mini) {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--iv-s) * 4.1);
  max-width: none;
  height: auto;
  transform: translate(-50%, -47%);
  -webkit-mask-image: radial-gradient(21.3% 30% at 50% 47%, #000 62%, transparent);
  mask-image: radial-gradient(21.3% 30% at 50% 47%, #000 62%, transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.iv-crest.big.ok img {
  opacity: 1;
}
.iv-crest.big .mini {
  position: relative;
  width: var(--iv-s);
  height: auto;
}
@media (prefers-reduced-motion: reduce) {
  .iv-crest.big img {
    transition: none;
  }
}
</style>
