<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useFormat, useInvadeUi, useNames } from '../context'
import { relation } from '../logic/detail'
import { tk } from '../logic/i18n'
import { positionName } from '../logic/labels'
import { FIGHT_GAP, PHASES, involves, isEpic, leadFor, scoreAt, storyOf, valueAt } from '../logic/story'
import type { Fight, GameEvent, KillEvent, ObjectiveEvent, PhaseId } from '../logic/story'
import type { MatchDetail, Objective, PlayerView, TimelineView } from '../logic/types'
import ObjectiveIcon from './ObjectiveIcon.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/detail.css'

/**
 * The game as a story told on one rail. By default it is the selected player's story (their
 * kills, deaths and assists, what they took, and the map-changing objectives as quiet context);
 * "Whole game" tells everyone's. Three chapters (laning, mid, late), each opening with what that
 * stretch came to; kills a few seconds apart fold into one fight with its score. Hovering an
 * event shows the state of the game at that second. Colour is the side an event counts for, seen
 * from the viewed player (blue yours, red theirs).
 */
const props = defineProps<{ detail: MatchDetail; timeline: TimelineView; selected: number; me?: PlayerView }>()
const emit = defineEmits<{ select: [index: number] }>()
const { t } = useInvadeUi()
const { mmss, num, signedGold } = useFormat()
const { champIcon, champName } = useNames()

const scope = shallowRef<'player' | 'game'>('player')
const FILTERS = [
  { id: 'all', label: tk('All') },
  { id: 'kills', label: tk('Kills') },
  { id: 'objectives', label: tk('Objectives') },
] as const
const filter = shallowRef<(typeof FILTERS)[number]['id']>('all')

const story = computed(() => storyOf(props.detail, props.timeline))
const player = (pid: number) => story.value.byId.get(pid)
const focus = computed(() => props.detail.players[props.selected])
const us = computed(() => props.me?.teamId ?? props.detail.players[0]?.teamId ?? 100)
const them = computed(() => (us.value === 100 ? 200 : 100))
const tone = (team: number) => relation(team, props.me)
const lead = computed(() => leadFor(props.timeline, us.value))
const duration = computed(() => Math.max(props.detail.duration, props.timeline.t[props.timeline.t.length - 1] ?? 0))

const groups = computed(() => {
  const ps = props.detail.players.map((p, i) => ({ p, i }))
  return [ps.filter((x) => x.p.teamId === us.value), ps.filter((x) => x.p.teamId !== us.value)].filter((g) => g.length)
})
function pick(i: number) {
  scope.value = 'player'
  emit('select', i)
}

// --- wording -----------------------------------------------------------------------------------------

const DRAGONS: Record<string, string> = {
  AIR_DRAGON: tk('Cloud drake'),
  FIRE_DRAGON: tk('Infernal drake'),
  EARTH_DRAGON: tk('Mountain drake'),
  WATER_DRAGON: tk('Ocean drake'),
  HEXTECH_DRAGON: tk('Hextech drake'),
  CHEMTECH_DRAGON: tk('Chemtech drake'),
  ELDER_DRAGON: tk('Elder dragon'),
}
const OBJECTIVES: Record<Objective['kind'], string> = {
  dragon: tk('Dragon'),
  baron: tk('Baron Nashor'),
  herald: tk('Rift Herald'),
  grubs: tk('Voidgrubs'),
  monster: tk('Epic monster'),
  tower: tk('Turret'),
  inhibitor: tk('Inhibitor'),
}
const ICONS: Record<Objective['kind'], 'tower' | 'inhib' | 'dragon' | 'grubs' | 'herald' | 'baron'> = {
  dragon: 'dragon',
  baron: 'baron',
  herald: 'herald',
  grubs: 'grubs',
  monster: 'dragon',
  tower: 'tower',
  inhibitor: 'inhib',
}
const LANES: Record<string, string> = { TOP_LANE: tk('Top'), MID_LANE: tk('Mid'), BOT_LANE: tk('Bot') }
const TOWERS: Record<string, string> = { OUTER_TURRET: tk('outer'), INNER_TURRET: tk('inner'), BASE_TURRET: tk('base'), NEXUS_TURRET: tk('Nexus') }
const MULTI = ['', '', tk('Double kill'), tk('Triple kill'), tk('Quadra kill'), tk('Penta kill')]
const PHASE_NAMES: Record<PhaseId, string> = { early: tk('Laning phase'), mid: tk('Mid game'), late: tk('Late game') }

function objName(o: Objective) {
  if (o.kind === 'dragon' && DRAGONS[o.sub]) return t(DRAGONS[o.sub])
  return t(OBJECTIVES[o.kind])
}
/** "Mid · outer" for buildings. */
function objWhere(o: Objective) {
  if (o.kind !== 'tower' && o.kind !== 'inhibitor') return ''
  return [LANES[o.lane], o.kind === 'tower' ? TOWERS[o.sub] : '']
    .filter(Boolean)
    .map((x) => t(x!))
    .join(' · ')
}
const champ = (pid: number) => {
  const p = player(pid)
  return p ? champName(p.championId) : ''
}
const icon = (pid: number) => champIcon(player(pid)?.championId ?? 0)
const who = (pid: number) => {
  const p = player(pid)
  return p ? `${p.gameName || champName(p.championId)} · ${champName(p.championId)}` : ''
}
const tagOf = (e: KillEvent) => (e.first ? t('First blood') : e.multi >= 2 ? t(MULTI[e.multi]) : '')

// --- the feed ----------------------------------------------------------------------------------------

/** One line of the feed. `role` is the focused player's part in it (player scope only). */
interface Line {
  key: string
  ev: GameEvent
  role: 'killer' | 'victim' | 'assist' | 'took' | 'context' | 'game'
  /** Seconds after the start of its fight, for the lines inside one. */
  offset: number
  /** Entrance order (rows animate in a few milliseconds apart). */
  idx: number
}
interface Node {
  key: string
  t: number
  lines: Line[]
  fight?: { ours: number; theirs: number; end: number; big: boolean }
  idx: number
}
interface Chapter {
  id: PhaseId
  from: number
  to: number
  nodes: Node[]
  ours: number
  theirs: number
  /** Focused player's kills / deaths / assists in this chapter (player scope). */
  kda: [number, number, number]
  /** Gold lead (viewed player's team) when the chapter ends. */
  lead: number
}

function roleOf(e: GameEvent, pid: number): Line['role'] {
  if (scope.value === 'game') return 'game'
  if (e.kind === 'objective') return e.obj.killer === pid ? 'took' : 'context'
  if (e.kill.killer === pid) return 'killer'
  if (e.kill.victim === pid) return 'victim'
  return 'assist'
}

const chapters = computed<Chapter[]>(() => {
  const pid = focus.value?.participantId ?? -1
  const s = story.value
  const end = duration.value
  const kept = s.events.filter((e) => {
    if (scope.value === 'player') return involves(e, pid) || isEpic(e)
    if (filter.value === 'kills') return e.kind === 'kill'
    if (filter.value === 'objectives') return e.kind === 'objective'
    return true
  })

  const nodes: Node[] = []
  let open: { node: Node; fight: number; end: number } | null = null
  for (const e of kept) {
    const fightIndex = e.kind === 'kill' ? e.fight : -1
    const inFight = open && (fightIndex === open.fight || (e.kind === 'objective' && e.t <= open.end + FIGHT_GAP))
    if (open && inFight) {
      open.node.lines.push({ key: e.key, ev: e, role: roleOf(e, pid), offset: e.t - open.node.t, idx: 0 })
      continue
    }
    open = null
    if (fightIndex >= 0) {
      const f: Fight = s.fights[fightIndex]
      const ours = f.kills.get(us.value) ?? 0
      const theirs = f.kills.get(them.value) ?? 0
      const node: Node = { key: `f${fightIndex}`, t: e.t, lines: [], fight: { ours, theirs, end: f.end, big: ours + theirs >= 5 }, idx: 0 }
      node.lines.push({ key: e.key, ev: e, role: roleOf(e, pid), offset: 0, idx: 0 })
      nodes.push(node)
      open = { node, fight: fightIndex, end: f.end }
    } else nodes.push({ key: e.key, t: e.t, lines: [{ key: e.key, ev: e, role: roleOf(e, pid), offset: 0, idx: 0 }], idx: 0 })
  }
  // Entrance order, capped so long feeds do not crawl in.
  let order = 0
  for (const n of nodes) {
    if (n.fight) n.idx = Math.min(order++, 18)
    for (const l of n.lines) l.idx = Math.min(order++, 18)
  }

  return PHASES.filter((ph) => ph.from < end).map((ph) => {
    const to = Math.min(ph.to, end)
    const inPhase = (x: number) => x >= ph.from && (x < ph.to || ph.to === Infinity)
    let ours = 0
    let theirs = 0
    const kda: [number, number, number] = [0, 0, 0]
    for (const e of s.events) {
      if (e.kind !== 'kill' || !inPhase(e.t)) continue
      if (e.team === us.value) ours++
      else theirs++
      if (e.kill.killer === pid) kda[0]++
      else if (e.kill.victim === pid) kda[1]++
      else if (e.kill.assists.includes(pid)) kda[2]++
    }
    return {
      id: ph.id,
      from: ph.from,
      to,
      nodes: nodes.filter((n) => inPhase(n.t)),
      ours,
      theirs,
      kda,
      lead: Math.round(valueAt(props.timeline.t, lead.value, to)),
    }
  })
})
const empty = computed(() => chapters.value.every((c) => !c.nodes.length))

/** State of the game at the hovered line: kill score and gold lead at that second. */
const hover = shallowRef<string | null>(null)
function stateAt(e: GameEvent) {
  const score = scoreAt(story.value, e.t)
  return {
    ours: score.get(us.value) ?? 0,
    theirs: score.get(them.value) ?? 0,
    lead: Math.round(valueAt(props.timeline.t, lead.value, e.t)),
  }
}

/** Who else took part in a kill: the assists, plus the killer when the focus only assisted. */
function company(l: Line): number[] {
  if (l.ev.kind !== 'kill') return []
  const k = l.ev.kill
  const ids = l.role === 'assist' ? [k.killer, ...k.assists] : k.assists
  const self = l.role === 'game' ? -1 : focus.value?.participantId
  return ids.filter((a) => a && a !== self)
}

const isKill = (e: GameEvent): e is KillEvent => e.kind === 'kill'
const isObj = (e: GameEvent): e is ObjectiveEvent => e.kind === 'objective'

// --- scroll edges: fade only where there is more to see -------------------------------------------------

const feed = shallowRef<HTMLElement | null>(null)
const edges = shallowRef({ top: false, bottom: false })
function measure() {
  const el = feed.value
  if (!el) return
  edges.value = { top: el.scrollTop > 4, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4 }
}
let ro: ResizeObserver | undefined
onMounted(() => {
  ro = new ResizeObserver(measure)
  if (feed.value) ro.observe(feed.value)
  measure()
})
onBeforeUnmount(() => ro?.disconnect())
watch([chapters, scope], () => requestAnimationFrame(() => {
  if (feed.value) feed.value.scrollTop = 0
  measure()
}))
/** The feed is rebuilt (and animates in again) when it tells another story. */
const feedKey = computed(() => `${scope.value}:${props.selected}:${filter.value}`)
</script>

<template>
  <div class="iv-evt">
    <header class="iv-evt-head">
      <div class="iv-evt-scope" role="group" :aria-label="t('Whose story')">
        <button type="button" class="iv-evt-all" :class="{ on: scope === 'game' }" :aria-pressed="scope === 'game'" @click="scope = 'game'">
          {{ t('Whole game') }}
        </button>
        <span v-for="(g, k) in groups" :key="k" class="iv-evt-team" :class="k ? 'enemy' : 'ally'">
          <button
            v-for="{ p, i } in g"
            :key="p.participantId"
            type="button"
            :class="{ on: scope === 'player' && i === selected }"
            :title="`${p.gameName || champName(p.championId)} · ${champName(p.championId)}`"
            :aria-pressed="scope === 'player' && i === selected"
            @click="pick(i)"
          >
            <img :src="champIcon(p.championId)" alt="" />
          </button>
        </span>
      </div>
      <p v-if="scope === 'player' && focus" class="iv-evt-who">
        <b>{{ focus.gameName || champName(focus.championId) }}</b>
        <small>{{ champName(focus.championId) }}<template v-if="focus.position"> · {{ positionName(focus.position, t) }}</template></small>
      </p>
      <div v-else class="iv-seg sm iv-evt-filter">
        <button v-for="f in FILTERS" :key="f.id" type="button" :class="{ on: filter === f.id }" @click="filter = f.id">{{ t(f.label) }}</button>
      </div>
    </header>

    <p v-if="empty" class="iv-pf-note">{{ t('Nothing here') }}</p>
    <div v-else ref="feed" :key="feedKey" class="iv-evt-feed" :class="{ 'fade-top': edges.top, 'fade-bottom': edges.bottom }" @scroll.passive="measure">
      <section v-for="c in chapters" :key="c.id" class="iv-evt-chapter">
        <h4 class="iv-evt-phase">
          <span class="iv-evt-phase-name">{{ t(PHASE_NAMES[c.id]) }}</span>
          <span class="iv-evt-phase-time">{{ mmss(c.from) }}–{{ mmss(c.to) }}</span>
          <span class="iv-evt-phase-facts">
            <span v-if="scope === 'player'" :title="t('Kills / deaths / assists in this phase')">
              <b>{{ c.kda[0] }}</b><i>/</i><b>{{ c.kda[1] }}</b><i>/</i><b>{{ c.kda[2] }}</b>
            </span>
            <span v-else :title="t('Kills in this phase')">
              <b class="ally">{{ c.ours }}</b><i>–</i><b class="enemy">{{ c.theirs }}</b> {{ t('kills') }}
            </span>
            <span :title="t('Team gold lead at {time}', { time: mmss(c.to) })">
              <b :class="c.lead > 0 ? 'ally' : c.lead < 0 ? 'enemy' : ''">{{ c.lead === 0 ? t('even') : signedGold(c.lead) }}</b> {{ t('gold') }}
            </span>
          </span>
        </h4>

        <p v-if="!c.nodes.length" class="iv-evt-quiet">{{ scope === 'player' ? t('Quiet for {name}', { name: champName(focus?.championId ?? 0) }) : t('Nothing here') }}</p>
        <ol v-else class="iv-evt-list">
          <li v-for="n in c.nodes" :key="n.key" class="iv-evt-node" :class="{ fight: n.fight }">
            <div v-if="n.fight" class="iv-evt-row iv-evt-fight" :style="{ '--i': n.idx }">
              <time>{{ mmss(n.t) }}</time>
              <i class="iv-evt-dot ring" :class="n.fight.ours > n.fight.theirs ? 'ally' : n.fight.ours < n.fight.theirs ? 'enemy' : ''" />
              <span class="iv-evt-body">
                <b>{{ n.fight.big ? t('Teamfight') : t('Skirmish') }}</b>
                <span class="iv-evt-score"><em class="ally">{{ n.fight.ours }}</em><i>–</i><em class="enemy">{{ n.fight.theirs }}</em></span>
                <span class="iv-evt-meta">{{ n.fight.ours > n.fight.theirs ? t('won') : n.fight.ours < n.fight.theirs ? t('lost') : t('traded') }} · {{ num(Math.max(1, n.fight.end - n.t)) }} s</span>
              </span>
            </div>
            <div
              v-for="l in n.lines"
              :key="l.key"
              class="iv-evt-row"
              :class="[{ nested: n.fight, context: l.role === 'context', on: hover === l.key }, `r-${l.role}`]"
              :style="{ '--i': l.idx }"
              @mouseenter="hover = l.key"
              @mouseleave="hover = null"
            >
              <time>{{ n.fight ? (l.offset ? `+${l.offset}s` : '') : mmss(l.ev.t) }}</time>
              <i class="iv-evt-dot" :class="[tone(l.ev.team), { hollow: l.role === 'context' }]" />

              <!-- Kills -->
              <span v-if="isKill(l.ev)" class="iv-evt-body">
                <template v-if="l.role === 'killer'">
                  <span class="iv-evt-verb">{{ t('Killed') }}</span>
                  <span class="iv-evt-art dead"><img :src="icon(l.ev.kill.victim)" alt="" :title="who(l.ev.kill.victim)" /></span>
                  <b>{{ champ(l.ev.kill.victim) }}</b>
                </template>
                <template v-else-if="l.role === 'victim'">
                  <span class="iv-evt-verb">{{ l.ev.kill.killer ? t('Slain by') : t('Executed') }}</span>
                  <template v-if="l.ev.kill.killer">
                    <span class="iv-evt-art"><img :src="icon(l.ev.kill.killer)" alt="" :title="who(l.ev.kill.killer)" /></span>
                    <b>{{ champ(l.ev.kill.killer) }}</b>
                  </template>
                </template>
                <template v-else-if="l.role === 'assist'">
                  <span class="iv-evt-verb">{{ t('Helped kill') }}</span>
                  <span class="iv-evt-art dead"><img :src="icon(l.ev.kill.victim)" alt="" :title="who(l.ev.kill.victim)" /></span>
                  <b>{{ champ(l.ev.kill.victim) }}</b>
                </template>
                <template v-else>
                  <template v-if="l.ev.kill.killer">
                    <span class="iv-evt-art"><img :src="icon(l.ev.kill.killer)" alt="" :title="who(l.ev.kill.killer)" /></span>
                    <b>{{ champ(l.ev.kill.killer) }}</b>
                  </template>
                  <span class="iv-evt-verb">{{ l.ev.kill.killer ? t('killed') : t('Executed') }}</span>
                  <span class="iv-evt-art dead"><img :src="icon(l.ev.kill.victim)" alt="" :title="who(l.ev.kill.victim)" /></span>
                  <span class="iv-evt-target">{{ champ(l.ev.kill.victim) }}</span>
                </template>
                <!-- Who else was there: the killer joins the stack when the focus only assisted. -->
                <span v-if="company(l).length" class="iv-evt-stack" :title="t('With')">
                  <img
                    v-for="a in company(l)"
                    :key="a"
                    :src="icon(a)"
                    :title="who(a)"
                    alt=""
                  />
                </span>
                <span v-if="tagOf(l.ev)" class="iv-badge" :class="{ gold: !l.ev.first }">{{ tagOf(l.ev) }}</span>
              </span>

              <!-- Objectives -->
              <span v-else-if="isObj(l.ev)" class="iv-evt-body">
                <span class="iv-evt-obj" :class="tone(l.ev.team)" :title="l.ev.team === us ? t('Your team') : t('Enemy team')"><ObjectiveIcon :name="ICONS[l.ev.obj.kind]" :size="15" /></span>
                <span v-if="l.role === 'took'" class="iv-evt-verb">{{ l.ev.obj.kind === 'tower' || l.ev.obj.kind === 'inhibitor' ? t('Destroyed') : t('Took') }}</span>
                <b>{{ objName(l.ev.obj) }}</b>
                <span v-if="l.ev.count > 1" class="iv-evt-meta">×{{ l.ev.count }}</span>
                <span v-if="objWhere(l.ev.obj)" class="iv-evt-meta">{{ objWhere(l.ev.obj) }}</span>
                <span v-if="l.role !== 'took' && player(l.ev.obj.killer)" class="iv-evt-stack solo" :title="who(l.ev.obj.killer)">
                  <img :src="icon(l.ev.obj.killer)" alt="" />
                </span>
              </span>

              <span v-if="hover === l.key" class="iv-evt-state" aria-hidden="true">
                <template v-for="s in [stateAt(l.ev)]" :key="s.lead">
                  <span><em class="ally">{{ s.ours }}</em><i>–</i><em class="enemy">{{ s.theirs }}</em></span>
                  <span :class="s.lead > 0 ? 'ally' : s.lead < 0 ? 'enemy' : ''">{{ s.lead === 0 ? t('even') : signedGold(s.lead) }}</span>
                </template>
              </span>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
