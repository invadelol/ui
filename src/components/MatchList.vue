<script setup lang="ts">
import { computed, nextTick, shallowRef, useSlots, watch } from 'vue'
import { useFormat, useInvadeUi, useNames } from '../context'
import { dayKey } from '../logic/format'
import { tk } from '../logic/i18n'
import { count, positionName, QUEUE_FILTERS } from '../logic/labels'
import type { MatchSummary, Position, QueueFilter, ScoreRow } from '../logic/types'
import Icon from './Icon.vue'
import MatchRow from './MatchRow.vue'
import MatchRowSkeleton from './MatchRowSkeleton.vue'
import RoleIcon from './RoleIcon.vue'

/**
 * The feed: one filter bar, one summary line of what it shows (record, KDA, form), then the
 * games grouped by day (or by champion). A row opens the host's `detail` slot right below it
 * (`{ game }`: the host loads the game and renders `MatchDetail`).
 */
const props = withDefaults(
  defineProps<{
    /** Whose games these are (favorites). */
    puuid: string
    games: MatchSummary[]
    scores: ReadonlyMap<number, ScoreRow>
    /** LP change per game id, when known (own accounts). */
    lp?: ReadonlyMap<number, number>
    status: 'loading' | 'ready' | 'error'
    /** What went wrong, shown with Try again (`retry`). */
    error?: string
    /** The history is private: says so instead of an error or an empty list. */
    private?: boolean
    more?: boolean
    loadingMore?: boolean
    /** A game to open and scroll to once it is in the list (a deep link). */
    focus?: number | null
  }>(),
  { lp: () => new Map(), error: '', private: false, more: false, loadingMore: false, focus: null },
)
const emit = defineEmits<{ more: []; retry: [] }>()
defineSlots<{ detail?: (props: { game: MatchSummary }) => unknown }>()
const slots = useSlots()
const { t } = useInvadeUi()
const { dayLabel, kdaRatio, num, pct, score100, signedLp } = useFormat()
const { champName } = useNames()

const queue = defineModel<QueueFilter>('queue', { required: true })
const champion = defineModel<number>('champion', { required: true })
const role = defineModel<Position | ''>('role', { required: true })
const order = defineModel<'recent' | 'champion'>('order', { required: true })

/** Shorter labels than the shared filter list: the bar says "queue" by itself. */
const SHORT: Partial<Record<QueueFilter, string>> = { all: tk('All'), solo: tk('Solo/Duo'), flex: tk('Flex') }
const queueOf = (id: QueueFilter) => QUEUE_FILTERS.find((f) => f.id === id)?.queues as readonly number[] | null | undefined
const inQueue = (g: MatchSummary, id: QueueFilter) => {
  const q = queueOf(id)
  return !q || q.includes(g.queueId)
}
/** Queue segments with games in the loaded history (and the active one). */
const queues = computed(() =>
  QUEUE_FILTERS.map((f) => ({ id: f.id as QueueFilter, label: SHORT[f.id as QueueFilter] ?? f.label, n: props.games.filter((g) => inQueue(g, f.id as QueueFilter)).length })).filter(
    (f) => f.id === 'all' || f.n > 0 || f.id === queue.value,
  ),
)
const ROLES: Position[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']
const roles = computed(() => ROLES.filter((r) => r === role.value || props.games.some((g) => g.lane === r)))
const championOptions = computed(() => {
  const counts = new Map<number, number>()
  for (const g of props.games) counts.set(g.championId, (counts.get(g.championId) ?? 0) + 1)
  if (champion.value && !counts.has(champion.value)) counts.set(champion.value, 0)
  return [...counts].sort((a, b) => champName(a[0]).localeCompare(champName(b[0]))).map(([id, n]) => ({ id, n }))
})
const filtered = computed(() => queue.value !== 'all' || !!champion.value || !!role.value)
function clear() {
  queue.value = 'all'
  champion.value = 0
  role.value = ''
}

const shown = computed(() => {
  const list = props.games.filter(
    (g) => inQueue(g, queue.value) && (!champion.value || g.championId === champion.value) && (!role.value || g.lane === role.value),
  )
  return order.value === 'champion'
    ? [...list].sort((a, b) => champName(a.championId).localeCompare(champName(b.championId)) || b.creation - a.creation)
    : [...list].sort((a, b) => b.creation - a.creation)
})

const summary = computed(() => {
  const played = shown.value.filter((g) => !g.remake)
  const wins = played.filter((g) => g.win).length
  const sum = (f: (g: MatchSummary) => number) => played.reduce((s, g) => s + f(g), 0)
  const minutes = sum((g) => g.duration) / 60
  const scored = played.map((g) => props.scores.get(g.gameId)?.score).filter((s): s is number => s != null)
  return {
    games: played.length,
    wins,
    losses: played.length - wins,
    kda: kdaRatio(sum((g) => g.kills), sum((g) => g.deaths), sum((g) => g.assists)),
    csMin: minutes ? sum((g) => g.cs) / minutes : 0,
    score: scored.length ? score100(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
    /** Oldest to newest, the latest 20. */
    form: [...shown.value.slice(0, 20)].sort((a, b) => a.creation - b.creation),
  }
})

interface Group {
  key: string
  label: string
  games: MatchSummary[]
  wins: number
  losses: number
  /** Net LP of the group, only when every ranked game in it has a known change. */
  lp: number | null
}
const groups = computed(() => {
  const out: Group[] = []
  const byKey = new Map<string, Group>()
  for (const g of shown.value) {
    const key = order.value === 'champion' ? String(g.championId) : dayKey(g.creation)
    let group = byKey.get(key)
    if (!group) {
      const label = order.value === 'champion' ? champName(g.championId) : dayLabel(g.creation)
      group = { key, label, games: [], wins: 0, losses: 0, lp: null }
      byKey.set(key, group)
      out.push(group)
    }
    group.games.push(g)
    if (!g.remake) g.win ? group.wins++ : group.losses++
  }
  for (const group of out) {
    const ranked = group.games.filter((g) => !g.remake && (g.queueId === 420 || g.queueId === 440))
    if (ranked.length && ranked.every((g) => props.lp.has(g.gameId))) group.lp = ranked.reduce((s, g) => s + props.lp.get(g.gameId)!, 0)
  }
  return out
})

const openId = shallowRef<number | null>(null)
const toggle = (id: number) => slots.detail && (openId.value = openId.value === id ? null : id)

// Deep link: open the game once it is loaded (filters cleared if they hide it), then bring it into view.
const root = shallowRef<HTMLElement | null>(null)
let revealed: number | null = null
watch(
  () => [props.focus, props.games] as const,
  async ([id]) => {
    if (!id || id === revealed) return
    const g = props.games.find((x) => x.gameId === id)
    if (!g) return
    revealed = id
    if (!shown.value.includes(g)) clear()
    order.value = 'recent'
    openId.value = id
    await nextTick()
    root.value?.querySelector(`[data-game="${id}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  },
  { immediate: true },
)
const formTitle = (g: MatchSummary) => `${champName(g.championId)} · ${g.remake ? t('Remake') : g.win ? t('Win') : t('Loss')} · ${g.kills}/${g.deaths}/${g.assists}`
</script>

<template>
  <section ref="root" class="iv-pf-feed">
    <div v-if="games.length" class="iv-pf-bar">
      <div class="iv-seg">
        <button v-for="f in queues" :key="f.id" type="button" :class="{ on: queue === f.id }" @click="queue = f.id">
          {{ t(f.label) }}<small v-if="f.id !== 'all'">{{ f.n }}</small>
        </button>
      </div>
      <div v-if="roles.length > 1 || role" class="iv-seg iv-pf-roleseg">
        <button
          v-for="r in roles"
          :key="r"
          type="button"
          :class="{ on: role === r }"
          :title="positionName(r, t)"
          :aria-label="positionName(r, t)"
          :aria-pressed="role === r"
          @click="role = role === r ? '' : r"
        >
          <RoleIcon :lane="r" />
        </button>
      </div>
      <select v-model.number="champion" class="iv-select iv-pf-select" :aria-label="t('Filter games by champion')">
        <option :value="0">{{ t('All champions') }}</option>
        <option v-for="c in championOptions" :key="c.id" :value="c.id">{{ champName(c.id) }} ({{ c.n }})</option>
      </select>
      <select v-model="order" class="iv-select iv-pf-select iv-pf-order" :aria-label="t('Sort games')">
        <option value="recent">{{ t('By date') }}</option>
        <option value="champion">{{ t('By champion') }}</option>
      </select>
    </div>

    <div v-if="status === 'ready' && summary.games" class="iv-pf-sum">
      <span class="iv-pf-sum-figs">
        <span><b>{{ count(summary.games, 'games', t) }}</b></span>
        <span><b>{{ t('{w}W {l}L', { w: summary.wins, l: summary.losses }) }}</b> {{ pct(summary.wins / summary.games) }}</span>
        <span><b>{{ summary.kda }}</b> {{ t('KDA') }}</span>
        <span><b>{{ num(summary.csMin, 1) }}</b> {{ t('CS/min') }}</span>
        <span v-if="summary.score !== null" :title="t('Average Invade score')"><b>{{ summary.score }}</b> {{ t('avg score') }}</span>
      </span>
      <span class="iv-form iv-pf-form" :title="t('Oldest to newest')">
        <i v-for="g in summary.form" :key="g.gameId" :class="g.remake ? 'r' : g.win ? 'w' : 'l'" :title="formTitle(g)" />
      </span>
      <button v-if="filtered" type="button" class="iv-btn ghost sm iv-pf-clear" @click="clear"><Icon name="x" :size="13" />{{ t('Clear filters') }}</button>
    </div>

    <!-- States: inside the area that holds the games. -->
    <div v-if="status === 'loading'" class="iv-pf-feed-skel">
      <span class="iv-skel iv-pf-skel-day" />
      <MatchRowSkeleton :count="7" />
    </div>
    <div v-else-if="status === 'error'" class="iv-pf-state">
      <template v-if="private">
        <p><Icon name="eye" :size="15" />{{ t("This player's match history is private.") }}</p>
      </template>
      <template v-else>
        <p class="iv-error"><Icon name="x" :size="15" />{{ error || t('Something went wrong') }}</p>
        <button type="button" class="iv-btn sm" @click="emit('retry')"><Icon name="refresh" :size="13" />{{ t('Try again') }}</button>
      </template>
    </div>
    <div v-else-if="!games.length" class="iv-pf-state">
      <p v-if="private"><Icon name="eye" :size="15" />{{ t("This player's match history is private.") }}</p>
      <p v-else>{{ t('No games in this history yet.') }}</p>
    </div>
    <div v-else-if="!shown.length" class="iv-pf-state">
      <p>{{ t('No games match these filters in the {n} loaded.', { n: games.length }) }}</p>
      <div class="iv-pf-state-actions">
        <button type="button" class="iv-btn sm" @click="clear">{{ t('Clear filters') }}</button>
        <button v-if="more" type="button" class="iv-btn ghost sm" :disabled="loadingMore" @click="emit('more')">
          {{ loadingMore ? t('Loading…') : t('Load older games') }}
        </button>
      </div>
    </div>

    <template v-else>
      <section v-for="group in groups" :key="group.key" class="iv-pf-day">
        <h3 class="iv-mr-day">
          {{ group.label }}
          <span>
            {{ t('{w}W {l}L', { w: group.wins, l: group.losses }) }}<template v-if="group.lp !== null"> · {{ signedLp(group.lp) }} {{ t('LP') }}</template>
          </span>
        </h3>
        <ul class="iv-mr-list">
          <li v-for="g in group.games" :key="g.gameId" class="iv-pf-match" :class="{ open: openId === g.gameId }" :data-game="g.gameId">
            <MatchRow :game="g" :score="scores.get(g.gameId) ?? null" :lp="lp.get(g.gameId) ?? null" :open="openId === g.gameId" :puuid="puuid" @toggle="toggle(g.gameId)" />
            <slot v-if="openId === g.gameId" name="detail" :game="g" />
          </li>
        </ul>
      </section>
      <button v-if="more" type="button" class="iv-btn ghost iv-pf-loadmore" :disabled="loadingMore" @click="emit('more')">
        <Icon v-if="!loadingMore" name="down" :size="14" />{{ loadingMore ? t('Loading…') : t('Load older games') }}
      </button>
    </template>
  </section>
</template>
