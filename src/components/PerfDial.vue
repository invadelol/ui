<script setup lang="ts">
import { computed } from 'vue'
import { tk } from '../logic/i18n'
import { useFormat, useInvadeUi } from '../context'

/**
 * The performance indicator: a dial open at the bottom, the Invade score (0‥100) in its centre and
 * the placement (MVP, ACE, 3rd…) in the opening. The arc is the score; its colour slides from red
 * (worst) through a muted Invade violet (middle) to blue (best), so most games read calm and only
 * the extremes stand out. The figure stays white (the text colour); MVP is gold. The arc draws in once.
 * `sm` (scoreboards, compact rows): a smaller dial, no placement. `score: null`: not scored yet.
 */
const props = withDefaults(defineProps<{ score: number | null; rank?: number; tag?: '' | 'mvp' | 'ace'; size?: 'md' | 'sm' }>(), {
  rank: 0,
  tag: '',
  size: 'md',
})
const { t } = useInvadeUi()
const { ordinal } = useFormat()

/** Colour stops (score, rgb): --loss, a muted --brand, --win; linear in RGB in between. */
const STOPS: [number, [number, number, number]][] = [
  [25, [255, 93, 110]],
  [57, [134, 124, 200]],
  [92, [76, 155, 255]],
]
const color = computed(() => {
  const s = props.score ?? 0
  if (s <= STOPS[0][0]) return STOPS[0][1].join(' ')
  if (s >= STOPS[2][0]) return STOPS[2][1].join(' ')
  const [[a, ca], [b, cb]] = s < STOPS[1][0] ? [STOPS[0], STOPS[1]] : [STOPS[1], STOPS[2]]
  const k = (s - a) / (b - a)
  return ca.map((x, i) => Math.round(x + (cb[i] - x) * k)).join(' ')
})

const TIERS: [number, string][] = [
  [85, tk('Exceptional game')],
  [70, tk('Great game')],
  [55, tk('Good game')],
  [40, tk('Average game')],
  [0, tk('Rough game')],
]
const place = computed(() => (props.tag === 'mvp' ? t('MVP') : props.tag === 'ace' ? t('ACE') : props.rank ? ordinal(props.rank) : ''))
const title = computed(() => {
  if (props.score === null) return undefined
  const s = props.score
  const parts = [t('Invade score {score}', { score: s }), t(TIERS.find(([min]) => s >= min)![1])]
  if (props.tag === 'mvp') parts.push(t('Best player of the winning team'))
  else if (props.tag === 'ace') parts.push(t('Best player of the losing team'))
  else if (props.rank) parts.push(t('{place} of 10', { place: ordinal(props.rank) }))
  return parts.join(' · ')
})

/* The dial: 250° of a radius-15 circle in a 40×40 box, open at the bottom. */
const R = 15
const LEN = (250 / 360) * 2 * Math.PI * R
const ARC = (() => {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180
    return `${(20 + R * Math.cos(a)).toFixed(2)} ${(20 + R * Math.sin(a)).toFixed(2)}`
  }
  return `M${p(145)}A${R} ${R} 0 1 1 ${p(395)}`
})()
/** Never a dot so short it reads as a glitch. */
const len = computed(() => (Math.max(3, Math.min(100, props.score ?? 0)) / 100) * LEN)
</script>

<template>
  <span class="iv-dial" :class="{ sm: size === 'sm', empty: score === null }" :style="{ '--c': color }" :title="title" :aria-label="title" :role="title ? 'img' : undefined">
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path class="iv-dial-track" :d="ARC" />
      <path v-if="score !== null" class="iv-dial-arc" :d="ARC" :stroke-dasharray="`${len} ${LEN}`" :style="{ '--len': len }" />
    </svg>
    <b>{{ score ?? '–' }}</b>
    <small v-if="size === 'md' && place && score !== null" class="iv-dial-place" :class="tag">{{ place }}</small>
  </span>
</template>

<style>
.iv-dial {
  position: relative;
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  font-variant-numeric: tabular-nums;
}
.iv-dial svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.iv-dial-track,
.iv-dial-arc {
  fill: none;
  stroke-width: 2.8;
}
.iv-dial-track {
  stroke: var(--track);
}
.iv-dial-arc {
  stroke: rgb(var(--c));
  stroke-linecap: round;
  animation: iv-dial-draw 700ms 80ms var(--ease) both;
}
@keyframes iv-dial-draw {
  from {
    stroke-dashoffset: var(--len);
  }
}
@media (prefers-reduced-motion: reduce) {
  .iv-dial-arc {
    animation: none;
  }
}
.iv-dial b {
  position: relative;
  margin-top: -3px;
  font-size: 15px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--text-1);
}
.iv-dial .iv-dial-place {
  position: absolute;
  bottom: 2px;
  left: 50%;
  overflow: visible;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  color: var(--text-2);
  transform: translateX(-50%);
}
.iv-dial .iv-dial-place.mvp {
  color: var(--gold-c);
}

/* Small: scoreboards and compact rows. */
.iv-dial.sm {
  width: 34px;
  height: 34px;
}
.iv-dial.sm .iv-dial-track,
.iv-dial.sm .iv-dial-arc {
  stroke-width: 3.2;
}
.iv-dial.sm b {
  margin-top: 0;
  font-size: 11.5px;
}

/* Not scored yet: the empty dial, quiet. */
.iv-dial.empty b {
  color: var(--text-4);
}
</style>
