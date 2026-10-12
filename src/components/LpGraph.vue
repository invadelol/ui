<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watchEffect } from 'vue'
import { useFormat, useInvadeUi } from '../context'
import { signedLp } from '../logic/format'
import { count, rankLabel, tierColor } from '../logic/labels'
import type { LpPoint, PlayerCard } from '../logic/types'
import RankCrest from './RankCrest.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * LP history (the desktop app records a snapshot of its own accounts whenever the rank
 * changes). Plots the continuous ladder value, so a promotion is a rise and not a drop to 0 LP;
 * one point per change, straight segments, division lines labelled with the rank in its tier
 * colour. Hovering reads a point; at rest the panel says how far the line went.
 */
const props = defineProps<{ points: LpPoint[]; card: Pick<PlayerCard, 'solo' | 'flex'> }>()
const { t } = useInvadeUi()
const { date: format } = useFormat()
const fill = `iv-lpg-${useId()}`

const queue = shallowRef<'solo' | 'flex'>('solo')
const queues = computed(() => (['solo', 'flex'] as const).filter((q) => props.points.filter((p) => p.queue === q).length > 1))
watchEffect(() => {
  if (queues.value.length && !queues.value.includes(queue.value)) queue.value = queues.value[0]
})
const pts = computed(() => props.points.filter((p) => p.queue === queue.value))
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
const H = 132
const T = 14
const B = 6
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND']
const DIVS = ['IV', 'III', 'II', 'I']

/** Ladder value → tier and "Gold II" (Master+ from 2800). */
function ladder(v: number): { tier: string; name: string } {
  if (v >= 2800) return { tier: 'MASTER', name: `${rankLabel({ tier: 'MASTER', division: '', lp: 0 }, false, t)}+` }
  const tier = TIERS[Math.floor(v / 400)] ?? 'IRON'
  const division = DIVS[Math.floor((v % 400) / 100)] ?? 'IV'
  return { tier, name: rankLabel({ tier, division, lp: 0 }, false, t) }
}

const geo = computed(() => {
  const p = pts.value
  if (p.length < 2) return null
  const v = p.map((x) => x.value)
  const lo = Math.max(0, Math.floor((Math.min(...v) - 10) / 100) * 100)
  let hi = Math.ceil((Math.max(...v) + 10) / 100) * 100
  if (hi - lo < 200) hi = lo + 200
  const step = hi - lo > 800 ? 400 : 100
  const x = (i: number) => 4 + (i * (W.value - 8)) / (p.length - 1)
  const y = (n: number) => T + ((hi - n) * (H - T - B)) / (hi - lo)
  let line = ''
  p.forEach((q, i) => (line += `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(q.value).toFixed(1)}`))
  const grid: { y: number; label: string; color: string }[] = []
  for (let g = Math.ceil(lo / step) * step; g < hi; g += step) {
    const l = ladder(g)
    grid.push({ y: y(g), label: l.name, color: tierColor(l.tier) })
  }
  const area = `${line}L${x(p.length - 1).toFixed(1)} ${H - B}L4 ${H - B}Z`
  return { line, area, grid, dots: p.map((q, i) => ({ x: x(i), y: y(q.value) })) }
})

const hover = shallowRef<number | null>(null)
function move(e: PointerEvent) {
  const el = e.currentTarget as SVGSVGElement
  const n = pts.value.length
  if (n < 2) return
  const px = (e.offsetX / el.clientWidth) * W.value
  hover.value = Math.max(0, Math.min(n - 1, Math.round(((px - 4) / (W.value - 8)) * (n - 1))))
}

const read = computed(() => {
  const p = pts.value
  const i = hover.value
  if (i === null || !p[i]) return null
  return { point: p[i], change: i > 0 ? Math.round(p[i].value - p[i - 1].value) : null }
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

    <template v-if="geo">
      <p class="iv-pf-lpg-read">
        <template v-if="read">
          <b :style="{ color: tierColor(read.point.tier) }">{{ rankLabel(read.point, false, t) }}</b>
          <span>{{ read.point.lp }}<span class="iv-unit">{{ t('LP') }}</span></span>
          <span v-if="read.change !== null" class="iv-pf-delta" :class="read.change > 0 ? 'up' : read.change < 0 ? 'down' : ''">{{ signedLp(read.change) }}</span>
          <small>{{ date(read.point.t, true) }}</small>
        </template>
        <template v-else-if="net">
          <span class="iv-pf-delta" :class="net.lp > 0 ? 'up' : net.lp < 0 ? 'down' : ''">{{ signedLp(net.lp) }}<span class="iv-unit">{{ t('LP') }}</span></span>
          <small>{{ t('since {date}', { date: date(net.since) }) }} · {{ count(pts.length - 1, 'changes', t) }}</small>
        </template>
      </p>
      <svg class="iv-pf-lpg-svg" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="t('LP history')" @pointermove="move" @pointerleave="hover = null">
        <defs>
          <linearGradient :id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="var(--brand)" stop-opacity="0.16" />
            <stop offset="1" stop-color="var(--brand)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="iv-pf-lpg-grid">
          <template v-for="g in geo.grid" :key="g.y">
            <line x1="0" :x2="W" :y1="g.y" :y2="g.y" />
            <text x="0" :y="g.y - 4" :style="{ fill: g.color }">{{ g.label }}</text>
          </template>
        </g>
        <path :d="geo.area" :fill="`url(#${fill})`" />
        <path :d="geo.line" class="iv-pf-lpg-line" />
        <template v-if="hover !== null">
          <line :x1="geo.dots[hover].x" :x2="geo.dots[hover].x" :y1="T" :y2="H - B" class="iv-pf-lpg-cross" />
          <circle :cx="geo.dots[hover].x" :cy="geo.dots[hover].y" r="3.5" class="iv-pf-lpg-dot" />
        </template>
        <circle v-else :cx="geo.dots[geo.dots.length - 1].x" :cy="geo.dots[geo.dots.length - 1].y" r="3" class="iv-pf-lpg-dot" />
      </svg>
    </template>
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
