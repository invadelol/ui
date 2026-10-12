<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watchEffect } from 'vue'
import { useFormat, useInvadeUi } from '../context'
import { monotone } from '../curve'
import { signedLp } from '../logic/format'
import { count, rankLabel, tierColor } from '../logic/labels'
import type { LpPoint, PlayerCard } from '../logic/types'
import RankCrest from './RankCrest.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * LP history (the desktop app records a snapshot of its own accounts whenever the rank
 * changes). Plots the continuous ladder value, so a promotion is a rise and not a drop to 0 LP:
 * one point per change, one smooth line in brand over a soft fade, and hairlines at the two or
 * three division (or tier) lines it moves around, named on the right edge. Hovering, or the arrow
 * keys, reads a change.
 */
const props = defineProps<{ points: LpPoint[]; card: Pick<PlayerCard, 'solo' | 'flex'> }>()
const { t } = useInvadeUi()
const { date: format } = useFormat()
const fill = `iv-lpg-${useId()}`

const queue = shallowRef<'solo' | 'flex'>('solo')
const queues = computed(() => (['solo', 'flex'] as const).filter((q) => props.points.some((p) => p.queue === q)))
watchEffect(() => {
  if (queues.value.length && !queues.value.includes(queue.value)) queue.value = queues.value[0]
})
const pts = computed(() => props.points.filter((p) => p.queue === queue.value))
const now = computed(() => pts.value[pts.value.length - 1])
const rank = computed(() => (queue.value === 'solo' ? props.card.solo : props.card.flex))

/** The drawing is as wide as the panel (measured once mounted), so the labels keep their size at any width. */
const W = shallowRef(300)
const box = shallowRef<HTMLElement | null>(null)
let sizer: ResizeObserver | undefined
onMounted(() => {
  sizer = new ResizeObserver(([e]) => {
    if (e.contentRect.width) W.value = Math.round(e.contentRect.width)
  })
  if (box.value) sizer.observe(box.value)
})
onBeforeUnmount(() => sizer?.disconnect())
const H = 128
const T = 14
const B = 10
/** Right edge kept for the line names. */
const GUTTER = 64
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND']
const DIVS = ['IV', 'III', 'II', 'I']

/** What starts at ladder value `v`: "Gold II", or "Gold" when the lines are tiers; Master+ from 2800, then its LP. */
function name(v: number, tiers: boolean): string {
  if (v > 2800) return `${v - 2800} ${t('LP')}`
  if (v === 2800) return `${rankLabel({ tier: 'MASTER', division: '', lp: 0 }, false, t)}+`
  const tier = TIERS[Math.floor(v / 400)] ?? 'IRON'
  return rankLabel({ tier, division: tiers ? '' : (DIVS[Math.floor((v % 400) / 100)] ?? 'IV'), lp: 0 }, false, t)
}

const geo = computed(() => {
  const p = pts.value
  if (p.length < 2) return null
  const v = p.map((x) => x.value)
  const min = Math.min(...v)
  const max = Math.max(...v)
  const pad = Math.max(max - min, 60) * 0.3
  const lo = Math.max(0, min - pad)
  const hi = max + pad
  // Division lines, or tier lines (or every other tier) when there would be more than three.
  const step = [100, 400, 800, 1600].find((s) => Math.floor(hi / s) - Math.ceil(lo / s) < 3) ?? 2800
  const right = W.value - GUTTER
  const x = (i: number) => 2 + (i * (right - 4)) / (p.length - 1)
  const y = (n: number) => T + ((hi - n) * (H - T - B)) / (hi - lo)
  const guides = []
  for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) guides.push({ y: y(g), name: name(g, step >= 400) })
  const dots = p.map((q, i) => [x(i), y(q.value)] as const)
  const line = monotone(dots)
  return { right, guides, dots, line, area: `${line}L${dots[dots.length - 1][0].toFixed(1)} ${H}L${dots[0][0].toFixed(1)} ${H}Z` }
})

const hover = shallowRef<number | null>(null)
const last = computed(() => pts.value.length - 1)
function move(e: PointerEvent) {
  const g = geo.value
  if (!g) return
  const r = (e.currentTarget as Element).getBoundingClientRect()
  const px = ((e.clientX - r.left) / r.width) * W.value
  hover.value = Math.max(0, Math.min(last.value, Math.round(((px - 2) / (g.right - 4)) * last.value)))
}
function key(e: KeyboardEvent) {
  const k = hover.value ?? last.value
  if (e.key === 'ArrowLeft') hover.value = Math.max(0, k - 1)
  else if (e.key === 'ArrowRight') hover.value = Math.min(last.value, k + 1)
  else if (e.key === 'Home') hover.value = 0
  else if (e.key === 'End') hover.value = last.value
  else if (e.key === 'Escape') hover.value = null
  else return
  e.preventDefault()
}

const read = computed(() => {
  const i = hover.value
  const p = pts.value[i ?? -1]
  if (i === null || !p || !geo.value) return null
  const [x, y] = geo.value.dots[i]
  return {
    point: p,
    x,
    y,
    change: i > 0 ? Math.round(p.value - pts.value[i - 1].value) : null,
    // Beside the point, on the side with room.
    style: x > geo.value.right / 2 ? { right: `${W.value - x + 10}px` } : { left: `${x + 10}px` },
  }
})
/** At rest: the net change over the whole line. */
const net = computed(() => {
  const p = pts.value
  return p.length > 1 ? { lp: Math.round(p[p.length - 1].value - p[0].value), since: p[0].t } : null
})
const peak = computed(() => {
  const p = pts.value
  if (p.length < 2) return null
  return p.reduce((a, b) => (b.value > a.value ? b : a))
})
const date = (ms: number, time = false) => format(ms, { day: 'numeric', month: 'short', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) })
</script>

<template>
  <section ref="box" class="iv-panel iv-pf-panel iv-pf-lpg">
    <header class="iv-panel-head">
      <h3>{{ t('LP history') }}</h3>
      <div v-if="queues.length > 1" class="iv-seg sm">
        <button type="button" :class="{ on: queue === 'solo' }" @click="queue = 'solo'">{{ t('Solo/Duo') }}</button>
        <button type="button" :class="{ on: queue === 'flex' }" @click="queue = 'flex'">{{ t('Flex') }}</button>
      </div>
      <span v-else-if="queues.length" class="meta">{{ queue === 'solo' ? t('Solo/Duo') : t('Flex') }}</span>
    </header>

    <p v-if="now" class="iv-pf-lpg-read">
      <span>{{ rankLabel(now, false, t) }}</span>
      <b>{{ now.lp }}<span class="iv-unit">{{ t('LP') }}</span></b>
      <small v-if="net">{{ signedLp(net.lp) }} {{ t('LP') }} · {{ t('since {date}', { date: date(net.since) }) }} · {{ count(pts.length - 1, 'changes', t) }}</small>
      <small v-else>{{ date(now.t, true) }}</small>
    </p>
    <div v-if="geo" class="iv-pf-lpg-plot" tabindex="0" role="img" :aria-label="t('LP history')" @keydown="key" @blur="hover = null">
      <svg :viewBox="`0 0 ${W} ${H}`" :height="H" aria-hidden="true" @pointermove="move" @pointerleave="hover = null">
        <defs>
          <linearGradient :id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="var(--brand)" stop-opacity="0.12" />
            <stop offset="1" stop-color="var(--brand)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="iv-pf-lpg-guides">
          <template v-for="g in geo.guides" :key="g.y">
            <line x1="0" :x2="W" :y1="g.y" :y2="g.y" />
            <text :x="W" :y="g.y - 4">{{ g.name }}</text>
          </template>
        </g>
        <path :d="geo.area" :fill="`url(#${fill})`" />
        <path :d="geo.line" class="iv-pf-lpg-line" />
        <line v-if="read" :x1="read.x" :x2="read.x" y1="0" :y2="H" class="iv-pf-lpg-cross" />
        <circle :cx="geo.dots[last][0]" :cy="geo.dots[last][1]" r="7" class="iv-pf-lpg-halo" />
        <circle :cx="geo.dots[last][0]" :cy="geo.dots[last][1]" r="3" class="iv-pf-lpg-dot" />
        <circle v-if="read" :cx="read.x" :cy="read.y" r="3" class="iv-pf-lpg-dot" />
      </svg>
      <p v-if="read" class="iv-pf-lpg-tip" :style="read.style">
        <span>{{ date(read.point.t, true) }}</span>
        <b>{{ rankLabel(read.point, false, t) }} {{ read.point.lp }} {{ t('LP') }}</b>
        <span v-if="read.change !== null">{{ signedLp(read.change) }}</span>
      </p>
    </div>
    <p v-else class="iv-pf-note">{{ t('Your LP history builds up as you play ranked games with Invade running.') }}</p>

    <dl v-if="peak || rank?.previous" class="iv-pf-facts">
      <div v-if="peak">
        <dt>{{ t('Peak') }}</dt>
        <dd>
          <RankCrest :tier="peak.tier" :size="16" />
          <b :style="{ color: tierColor(peak.tier) }">{{ rankLabel(peak, false, t) }}</b>
          {{ peak.lp }} {{ t('LP') }}
        </dd>
      </div>
      <div v-if="rank?.previous">
        <dt>{{ t('Last season') }}</dt>
        <dd>
          <RankCrest :tier="rank.previous" :size="16" />
          <b :style="{ color: tierColor(rank.previous) }">{{ rankLabel({ ...rank, tier: rank.previous, division: '' }, false, t) }}</b>
        </dd>
      </div>
    </dl>
  </section>
</template>
