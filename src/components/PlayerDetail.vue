<script setup lang="ts">
import { computed } from 'vue'
import { useFormat, useInvadeUi, useNames } from '../context'
import { hideBroken } from '../dom'
import { laneLead, PINGS, relation, SCORE_PARTS, skillMatrix, skillPriority } from '../logic/detail'
import { positionName } from '../logic/labels'
import type { MatchDetail, Ping, PlayerView } from '../logic/types'
import PerfDial from './PerfDial.vue'
import RoleIcon from './RoleIcon.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/detail.css'

/**
 * One player's game, opened under their scoreboard row: the build (items, spells, skill order,
 * runes), the score with what it is made of and their numbers against the best of the game, and
 * the lane against its opponent (leads at 10 and 15 minutes, pings). What the source does not
 * record (a skill order without a timeline, pings from the League client) is left out.
 */
const props = defineProps<{ detail: MatchDetail; player: PlayerView; me?: PlayerView }>()
const { t } = useInvadeUi()
const { compact, num, ordinal, score100, signedGold } = useFormat()
const { champIcon, champName, itemIcon, itemName, runeIcon, runeName, spellIcon, spellName, styleIcon, styleName } = useNames()

const p = computed(() => props.player)
const opp = computed(() => props.detail.players.find((x) => x.participantId === p.value.opponent))
const minutes = computed(() => Math.max(props.detail.duration / 60, 1))
const tag = computed(() => (p.value.badges.includes('mvp') ? 'mvp' : p.value.badges.includes('ace') ? 'ace' : ''))

const skills = computed(() => skillMatrix(p.value.skills))
const priority = computed(() => skillPriority(p.value.skills))
const trees = computed(() => {
  const [primary, secondary] = p.value.styles
  const [keystone, ...rest] = p.value.perks.filter(Boolean)
  return { primary, keystone, minor: rest.slice(0, 3), secondary, picks: rest.slice(3) }
})

/** A value against the best of the game, 0‥100. */
const best = (f: (x: PlayerView) => number) => Math.max(1, ...props.detail.players.map(f))
const bar = (f: (x: PlayerView) => number) => (f(p.value) / best(f)) * 100

interface Stat {
  label: string
  value: string
  bar?: number
  /** A shade of the damage split. */
  dot?: 1 | 2 | 3
}
const groups = computed<{ title: string; rows: Stat[] }[]>(() => {
  const x = p.value
  return [
    {
      title: t('Combat'),
      rows: [
        { label: t('Damage to champions'), value: compact(x.damage), bar: bar((y) => y.damage) },
        { label: t('Damage taken'), value: compact(x.damageTaken), bar: bar((y) => y.damageTaken) },
        { label: t('Physical'), value: compact(x.physical), dot: 1 },
        { label: t('Magic'), value: compact(x.magic), dot: 2 },
        { label: t('True'), value: compact(x.trueDamage), dot: 3 },
      ],
    },
    {
      title: t('Vision & objectives'),
      rows: [
        { label: t('Vision score'), value: num(x.vision), bar: bar((y) => y.vision) },
        { label: t('Wards placed'), value: num(x.wardsPlaced), bar: bar((y) => y.wardsPlaced) },
        { label: t('Wards destroyed'), value: num(x.wardsKilled), bar: bar((y) => y.wardsKilled) },
        { label: t('Control wards'), value: num(x.controlWards), bar: bar((y) => y.controlWards) },
        { label: t('Objective damage'), value: compact(x.objectiveDamage), bar: bar((y) => y.objectiveDamage) },
        { label: t('Turret damage'), value: compact(x.turretDamage), bar: bar((y) => y.turretDamage) },
      ],
    },
    {
      title: t('Economy'),
      rows: [
        { label: t('Gold'), value: compact(x.gold), bar: bar((y) => y.gold) },
        { label: t('Gold per minute'), value: num(x.gold / minutes.value) },
        { label: t('CS'), value: num(x.cs), bar: bar((y) => y.cs) },
        { label: t('CS per minute'), value: num(x.csMin, 1) },
        { label: t('Lane minions'), value: num(x.cs - x.jungleCs) },
        { label: t('Jungle monsters'), value: num(x.jungleCs) },
      ],
    },
  ]
})

/** Mine against theirs, one stat per row; `--a` is my share of the two. */
const duel = computed(() => {
  const a = p.value
  const b = opp.value
  if (!b) return []
  const row = (label: string, mine: number, theirs: number, f: (n: number) => string) => ({
    label,
    mine: f(mine),
    theirs: f(theirs),
    lead: Math.sign(mine - theirs),
    share: mine + theirs > 0 ? (mine / (mine + theirs)) * 100 : 50,
  })
  const plain = (n: number) => num(n)
  return [
    row(t('Damage'), a.damage, b.damage, compact),
    row(t('Taken'), a.damageTaken, b.damageTaken, compact),
    row(t('Gold'), a.gold, b.gold, compact),
    row(t('CS'), a.cs, b.cs, plain),
    row(t('Vision'), a.vision, b.vision, plain),
    row(t('Objectives'), a.objectiveDamage, b.objectiveDamage, compact),
  ]
})
const oppSide = computed(() => (opp.value ? relation(opp.value.teamId, props.me) : 'enemy'))
const mineSide = computed(() => (props.me && p.value.participantId === props.me.participantId ? 'self' : relation(p.value.teamId, props.me)))

/** Leads at 10 and 15 minutes, read off the timeline (each only when the game got there). */
const checkpoints = computed(() => {
  const tl = props.detail.timeline
  const b = opp.value
  if (!tl || !b) return []
  const i = props.detail.players.indexOf(p.value)
  const j = props.detail.players.indexOf(b)
  return [10, 15].flatMap((m) => laneLead(tl, i, j, m) ?? [])
})
const tone = (n: number) => (n > 0 ? 'iv-up' : n < 0 ? 'iv-down' : '')
const signed = (n: number) => `${n > 0 ? '+' : ''}${num(n)}`

const pings = computed(() => {
  const all = p.value.pings
  if (!all) return null
  const rows = (Object.keys(PINGS) as Ping[]).filter((k) => all[k] > 0).map((k) => ({ label: t(PINGS[k]), n: all[k] }))
  const total = rows.reduce((s, r) => s + r.n, 0)
  return { total, rows: rows.sort((a, b) => b.n - a.n) }
})

const who = (x: PlayerView) => x.gameName || champName(x.championId)
</script>

<template>
  <div class="iv-pd">
    <div class="iv-pd-grid">
      <!-- The build -->
      <section class="iv-pd-col">
        <h4 class="iv-label">{{ t('Build') }}</h4>
        <span class="iv-pd-items">
          <template v-for="(id, i) in p.items" :key="i">
            <img v-if="id" :src="itemIcon(id)" :alt="itemName(id)" :title="itemName(id)" :class="{ trinket: i === 6 }" @error="hideBroken" />
            <i v-else :class="{ trinket: i === 6 }" />
          </template>
        </span>

        <div class="iv-pd-kit">
          <div>
            <h4 class="iv-label">{{ t('Spells') }}</h4>
            <span class="iv-pd-spells">
              <img v-for="(s, i) in p.spells" :key="i" :src="spellIcon(s)" :alt="spellName(s)" :title="spellName(s)" @error="hideBroken" />
            </span>
          </div>
          <div v-if="priority.length">
            <h4 class="iv-label">{{ t('Skill priority') }}</h4>
            <span class="iv-pd-prio">
              <template v-for="(key, i) in priority" :key="key">
                <i v-if="i">›</i><b>{{ key }}</b>
              </template>
            </span>
          </div>
        </div>

        <div v-if="p.skills.length" class="iv-pd-block">
          <h4 class="iv-label">{{ t('Skill order') }}</h4>
          <div class="iv-pd-skills">
            <div v-for="(row, key) in skills" :key="key" class="iv-pd-skill-row">
              <span>{{ key }}</span>
              <i v-for="(level, k) in row" :key="k" :class="{ on: level, r: key === 'R' }">{{ level }}</i>
            </div>
          </div>
        </div>

        <div v-if="trees.keystone" class="iv-pd-block iv-pd-runes">
          <div>
            <h4 class="iv-pd-tree"><img :src="styleIcon(trees.primary)" alt="" @error="hideBroken" />{{ styleName(trees.primary) }}</h4>
            <p class="iv-pd-rune key"><img :src="runeIcon(trees.keystone)" alt="" @error="hideBroken" />{{ runeName(trees.keystone) }}</p>
            <p v-for="id in trees.minor" :key="id" class="iv-pd-rune"><img :src="runeIcon(id)" alt="" @error="hideBroken" />{{ runeName(id) }}</p>
          </div>
          <div v-if="trees.secondary">
            <h4 class="iv-pd-tree"><img :src="styleIcon(trees.secondary)" alt="" @error="hideBroken" />{{ styleName(trees.secondary) }}</h4>
            <p v-for="id in trees.picks" :key="id" class="iv-pd-rune"><img :src="runeIcon(id)" alt="" @error="hideBroken" />{{ runeName(id) }}</p>
            <p v-if="p.shards" class="iv-pd-shards">
              <img v-for="(id, i) in p.shards" :key="i" :src="runeIcon(id)" :alt="runeName(id)" :title="runeName(id)" @error="hideBroken" />
            </p>
          </div>
        </div>
      </section>

      <!-- The score and the numbers, against the best of the game -->
      <section class="iv-pd-col">
        <div v-if="p.score !== null" class="iv-pd-score">
          <PerfDial :score="score100(p.score)" :rank="p.rank" :tag="tag" />
          <span>
            <b>{{ t('Score') }}</b>
            <small v-if="p.rank">{{ t('{place} of {n} in this game', { place: ordinal(p.rank), n: detail.players.length }) }}</small>
          </span>
        </div>
        <ul v-if="p.parts.length" class="iv-pd-parts">
          <li v-for="part in p.parts" :key="part.key">
            <span>{{ t(SCORE_PARTS[part.key]) }}</span>
            <i class="iv-pd-meter"><em :style="{ width: `${part.value}%` }" /></i>
            <b>{{ part.value }}</b>
            <small :title="t('{n}% of the score for this role', { n: part.weight })">×{{ part.weight }}%</small>
          </li>
        </ul>

        <div v-for="g in groups" :key="g.title" class="iv-pd-block">
          <h4 class="iv-label">{{ g.title }}</h4>
          <ul class="iv-pd-stats">
            <li v-for="r in g.rows" :key="r.label">
              <span><i v-if="r.dot" class="iv-pd-dot" :class="`d${r.dot}`" />{{ r.label }}</span>
              <b>{{ r.value }}</b>
              <i v-if="r.bar !== undefined" class="iv-pd-meter"><em :style="{ width: `${r.bar}%` }" /></i>
            </li>
          </ul>
        </div>
      </section>

      <!-- The lane -->
      <section v-if="opp || pings" class="iv-pd-col">
        <div v-if="opp">
          <h4 class="iv-label">{{ t('Lane matchup') }}</h4>
          <header class="iv-pd-vs">
            <span class="iv-pd-who">
              <img :src="champIcon(p.championId)" alt="" />
              <span>
                <b :title="who(p)">{{ who(p) }}</b>
                <small><RoleIcon v-if="p.position" :lane="p.position" :size="11" />{{ p.position ? positionName(p.position, t) : champName(p.championId) }}</small>
              </span>
            </span>
            <span class="iv-brk-vs">{{ t('vs') }}</span>
            <span class="iv-pd-who right">
              <span>
                <b :title="who(opp)">{{ who(opp) }}</b>
                <small>{{ champName(opp.championId) }}</small>
              </span>
              <img :src="champIcon(opp.championId)" alt="" />
            </span>
          </header>
          <ul class="iv-brk-rows">
            <li v-for="r in duel" :key="r.label" class="iv-brk-row" :style="{ '--a': `${r.share}%` }">
              <span class="iv-brk-n" :class="{ win: r.lead > 0 }">{{ r.mine }}</span>
              <span class="iv-brk-row-label">{{ r.label }}</span>
              <span class="iv-brk-n right" :class="{ win: r.lead < 0 }">{{ r.theirs }}</span>
              <span class="iv-brk-split"
                ><i class="a" :class="[mineSide, { 'iv-brk-ahead': r.lead > 0, 'iv-brk-even': !r.lead }]" /><i class="b" :class="[oppSide, { 'iv-brk-ahead': r.lead < 0, 'iv-brk-even': !r.lead }]"
              /></span>
            </li>
          </ul>
        </div>

        <div class="iv-pd-after">
          <div v-if="checkpoints.length" class="iv-pd-block iv-pd-rule">
            <h4 class="iv-label">{{ t('Lane checkpoints') }}</h4>
            <div class="iv-pd-check">
              <span>{{ t('At') }}</span><span>{{ t('Gold') }}</span><span>{{ t('CS') }}</span><span>{{ t('XP') }}</span>
              <template v-for="c in checkpoints" :key="c.minute">
                <b>{{ t('{n} min', { n: c.minute }) }}</b>
                <b :class="tone(c.gold)">{{ signedGold(c.gold) }}</b>
                <b :class="tone(c.cs)">{{ signed(c.cs) }}</b>
                <b :class="tone(c.xp)">{{ signedGold(c.xp) }}</b>
              </template>
            </div>
          </div>

          <div v-if="pings" class="iv-pd-block" :class="{ 'iv-pd-rule': opp }">
            <h4 class="iv-label">{{ t('Pings') }} · {{ pings.total }}</h4>
            <ul v-if="pings.rows.length" class="iv-pd-stats">
              <li v-for="r in pings.rows" :key="r.label">
                <span>{{ r.label }}</span>
                <b>{{ r.n }}</b>
                <i class="iv-pd-meter"><em :style="{ width: `${(r.n / pings.total) * 100}%` }" /></i>
              </li>
            </ul>
            <p v-else class="iv-pf-note">{{ t('No pings this game.') }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
