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
 * changes). Plots the continuous ladder value, so a promotion is a rise and not a drop to 0 LP,
 * one point per change, over the divisions it crossed: each a band in its tier's colour, named on
 * the right edge. At rest the line, its start and where it stands now, and how far it went;
 * hovering (or the arrow keys) reads a change: its date, rank, LP, the change and, when one game
 * explains it, the game's result, marked on every point while the pointer is on the chart.
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
const H = 152
const T = 10
const B = 10
/** Right edge kept for the band names. */
const GUTTER = 72
const PAD = 6
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND']
const DIVS = ['IV', 'III', 'II', 'I']

/** The band starting at ladder value `v`: its tier and name ("Gold II"; Master+ from 2800, then its LP). */
function band(v: number): { tier: string; name: string } {
  if (v >= 2800) return { tier: 'MASTER', name: v > 2800 ? `${v - 2800} ${t('LP')}` : `${rankLabel({ tier: 'MASTER', division: '', lp: 0 }, false, t)}+` }
  const tier = TIERS[Math.floor(v / 400)] ?? 'IRON'
  return { tier, name: rankLabel({ tier, division: DIVS[Math.floor((v % 400) / 100)] ?? 'IV', lp: 0 }, false, t) }
}

/** What one change was, when exactly one game explains it (wins or losses grew by one). */
function result(i: number): 'win' | 'loss' | null {
  const a = pts.value[i - 1]
  const b = pts.value[i]
  if (!a) return null
  const won = b.wins - a.wins
  const lost = b.losses - a.losses
  return won + lost !== 1 || won < 0 || lost < 0 ? null : won ? 'win' : 'loss'
}

const geo = computed(() => {
  const p = pts.value
  if (!p.length) return null
  const v = p.map((x) => x.value)
  // Whole divisions around the line; past eight, whole tiers.
  let step = 100
  let lo = Math.floor(Math.min(...v) / step) * step
  let hi = Math.floor(Math.max(...v) / step) * step + step
  if (hi - lo > 800) {
    step = 400
    lo = Math.floor(lo / step) * step
    hi = Math.ceil(hi / step) * step
  }
  const right = W.value - GUTTER
  const x = (i: number) => (p.length > 1 ? PAD + (i * (right - 2 * PAD)) / (p.length - 1) : right - PAD)
  const y = (n: number) => T + ((hi - n) * (H - T - B)) / (hi - lo)
  const bands = []
  for (let g = lo; g < hi; g += step) {
    const b = band(g)
    bands.push({ key: g, top: y(g + step), bottom: y(g), edge: g % 400 === 0 || g >= 2800, name: b.name, color: tierColor(b.tier) })
  }
  const dots = p.map((q, i) => ({ x: x(i), y: y(q.value), result: result(i) }))
  const line = p.length > 1 ? dots.map((d, i) => `${i ? 'L' : 'M'}${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join('') : `M${PAD} ${dots[0].y.toFixed(1)}H${dots[0].x.toFixed(1)}`
  const area = `${line}L${dots[dots.length - 1].x.toFixed(1)} ${H - B}L${p.length > 1 ? dots[0].x.toFixed(1) : PAD} ${H - B}Z`
  return { right, bands, dots, line, area }
})

const hover = shallowRef<number | null>(null)
const last = computed(() => pts.value.length - 1)
function move(e: PointerEvent) {
  const g = geo.value
  if (!g || last.value < 1) return
  const r = (e.currentTarget as Element).getBoundingClientRect()
  const px = ((e.clientX - r.left) / r.width) * W.value
  hover.value = Math.max(0, Math.min(last.value, Math.round(((px - PAD) / (g.right - 2 * PAD)) * last.value)))
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
  const dot = geo.value.dots[i]
  return {
    point: p,
    dot,
    change: i > 0 ? Math.round(p.value - pts.value[i - 1].value) : null,
    // The card sits beside the point, on the side with room.
    style: dot.x > geo.value.right / 2 ? { right: `${W.value - dot.x + 12}px` } : { left: `${dot.x + 12}px` },
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
const tone = (n: number) => (n > 0 ? 'iv-up' : n < 0 ? 'iv-down' : '')
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
        <template v-if="net">
          <b class="iv-pf-lpg-net" :class="tone(net.lp)">{{ signedLp(net.lp) }}<span class="iv-unit">{{ t('LP') }}</span></b>
          <small>{{ t('since {date}', { date: date(net.since) }) }} · {{ count(pts.length - 1, 'changes', t) }}</small>
        </template>
        <template v-else>
          <b :style="{ color: tierColor(pts[0].tier) }">{{ rankLabel(pts[0], false, t) }}</b>
          <span>{{ pts[0].lp }}<span class="iv-unit">{{ t('LP') }}</span></span>
          <small>{{ date(pts[0].t, true) }}</small>
        </template>
      </p>
      <div
        class="iv-pf-lpg-plot"
        :class="{ on: hover !== null }"
        :tabindex="last > 0 ? 0 : undefined"
        role="img"
        :aria-label="t('LP history')"
        @keydown="key"
        @blur="hover = null"
      >
        <svg :viewBox="`0 0 ${W} ${H}`" :height="H" aria-hidden="true" @pointermove="move" @pointerleave="hover = null">
          <defs>
            <linearGradient :id="fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="var(--brand)" stop-opacity="0.2" />
              <stop offset="1" stop-color="var(--brand)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g class="iv-pf-lpg-bands">
            <template v-for="b in geo.bands" :key="b.key">
              <rect x="0" :y="b.top" :width="geo.right" :height="b.bottom - b.top" :style="{ fill: b.color }" />
              <line x1="0" :x2="W" :y1="b.bottom" :y2="b.bottom" :class="{ edge: b.edge }" />
              <text :x="W" :y="(b.top + b.bottom) / 2" :style="{ fill: b.color }">{{ b.name }}</text>
            </template>
            <line x1="0" :x2="W" :y1="T" :y2="T" class="edge" />
          </g>
          <path :d="geo.area" :fill="`url(#${fill})`" />
          <path :d="geo.line" class="iv-pf-lpg-line" :class="{ flat: pts.length < 2 }" />
          <line v-if="read" :x1="read.dot.x" :x2="read.dot.x" :y1="T" :y2="H - B" class="iv-pf-lpg-cross" />
          <g class="iv-pf-lpg-marks">
            <circle v-for="(d, i) in geo.dots.slice(1)" :key="i" :cx="d.x" :cy="d.y" r="2.5" :class="d.result" />
          </g>
          <circle v-if="pts.length > 1" :cx="geo.dots[0].x" :cy="geo.dots[0].y" r="3" class="iv-pf-lpg-first" />
          <circle :cx="geo.dots[last].x" :cy="geo.dots[last].y" r="8" class="iv-pf-lpg-halo" />
          <circle :cx="geo.dots[last].x" :cy="geo.dots[last].y" r="3.5" class="iv-pf-lpg-now" />
          <circle v-if="read" :cx="read.dot.x" :cy="read.dot.y" r="4.5" class="iv-pf-lpg-hot" :class="read.dot.result" />
        </svg>
        <div v-if="read" class="iv-pf-lpg-tip" :style="read.style">
          <small>{{ date(read.point.t, true) }}</small>
          <p>
            <b :style="{ color: tierColor(read.point.tier) }">{{ rankLabel(read.point, false, t) }}</b>
            {{ read.point.lp }}<span class="iv-unit">{{ t('LP') }}</span>
          </p>
          <p v-if="read.change !== null">
            <b :class="tone(read.change)">{{ signedLp(read.change) }}<span class="iv-unit">{{ t('LP') }}</span></b>
            <span v-if="read.dot.result" :class="read.dot.result">{{ read.dot.result === 'win' ? t('Win') : t('Loss') }}</span>
          </p>
        </div>
      </div>
      <p v-if="pts.length < 2" class="iv-pf-note">{{ t('Your LP history builds up as you play ranked games with Invade running.') }}</p>
    </template>
    <div v-else class="iv-pf-lpg-empty">
      <p class="iv-pf-note">{{ t('Your LP history builds up as you play ranked games with Invade running.') }}</p>
    </div>

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
