<script setup lang="ts">
import { computed, useId } from 'vue'
import '../styles/base.css'

/**
 * A straight-segment line: the player's series in brand, an
 * optional dashed baseline (what a delta is computed against) and an optional shaded band over
 * the last points (what "last 5" means). Stretches to its box; strokes keep their width.
 */
const props = withDefaults(
  defineProps<{
    values: number[]
    height?: number
    baseline?: number | null
    /** Shade the last N points. */
    band?: number
    area?: boolean
  }>(),
  { height: 28, baseline: null, band: 0, area: false },
)

const PAD = 3
const geo = computed(() => {
  const v = props.values.filter((x) => Number.isFinite(x))
  if (v.length < 2) return null
  const all = props.baseline != null ? [...v, props.baseline] : v
  let min = Math.min(...all)
  let max = Math.max(...all)
  if (max - min < 1e-9) {
    min -= 1
    max += 1
  }
  const h = props.height
  const y = (x: number) => PAD + (1 - (x - min) / (max - min)) * (h - PAD * 2)
  const x = (i: number) => (i / (v.length - 1)) * 100
  const pts = v.map((val, i) => `${x(i).toFixed(2)},${y(val).toFixed(2)}`)
  const bandFrom = props.band > 0 && props.band < v.length ? x(v.length - props.band) : null
  return {
    line: pts.join(' '),
    area: `0,${h} ${pts.join(' ')} 100,${h}`,
    base: props.baseline != null ? y(props.baseline) : null,
    bandFrom,
    h,
  }
})
const id = `iv-trend-${useId()}`
</script>

<template>
  <svg v-if="geo" class="iv-trend" :viewBox="`0 0 100 ${geo.h}`" preserveAspectRatio="none" :height="geo.h" aria-hidden="true">
    <defs v-if="area">
      <linearGradient :id="id" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="var(--brand)" stop-opacity="0.16" />
        <stop offset="1" stop-color="var(--brand)" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect v-if="geo.bandFrom != null" :x="geo.bandFrom" y="0" :width="100 - geo.bandFrom" :height="geo.h" class="iv-trend-band" />
    <line v-if="geo.base != null" x1="0" x2="100" :y1="geo.base" :y2="geo.base" class="iv-trend-base" />
    <polygon v-if="area" :points="geo.area" :fill="`url(#${id})`" />
    <polyline :points="geo.line" class="iv-trend-series" />
  </svg>
  <span v-else class="iv-trend empty" />
</template>

<style>
.iv-trend {
  display: block;
  width: 100%;
  overflow: visible;
}
.iv-trend-series {
  fill: none;
  stroke: var(--brand);
  stroke-width: 1.5;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.iv-trend-base {
  stroke: var(--text-4);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  vector-effect: non-scaling-stroke;
}
.iv-trend-band {
  fill: var(--glint);
}
</style>
