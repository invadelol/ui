<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { gameFavorite, useFormat, useInvadeUi, useNames } from '../context'
import { tk } from '../logic/i18n'
import { hasEvents } from '../logic/detail'
import type { MatchDetail } from '../logic/types'
import Icon from './Icon.vue'
import StarButton from './StarButton.vue'
import Scoreboard from './Scoreboard.vue'
import Breakdown from './Breakdown.vue'
import GoldChart from './GoldChart.vue'
import Timeline from './Timeline.vue'
import BuildTab from './BuildTab.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/detail.css'

/**
 * "Why did this game go this way?" The row right above already says the result, queue, duration
 * and the player's own numbers, so the detail does not repeat them: tabs, the game's patch and
 * start on the same line, and its favorite star, then the tab. `selected` (index into `players`)
 * is shared by the tabs that are about one player and starts on the viewed player.
 *
 * The host loads the game: `detail` null while it loads (the detail's own shapes), `error` a
 * message when it could not (with Try again, `retry`). A host that already has the scoreboard
 * (invade.lol's match list) passes it with `loading` while the rest comes: the tabs that need the
 * timeline wait for it, and nothing says the game has none.
 */
const props = withDefaults(
  defineProps<{
    detail: MatchDetail | null
    /** The viewed player (whose profile the list belongs to). */
    puuid: string
    error?: string | null
    /** invade.lol's id of the game, kept with a favorite. */
    matchId?: string | null
    /** `detail` is a partial game; the full one (with its timeline, if any) is on its way. */
    loading?: boolean
  }>(),
  { error: null, matchId: null, loading: false },
)
defineEmits<{ retry: [] }>()

const ui = useInvadeUi()
const { t } = ui
const { date } = useFormat()
const { champName } = useNames()

const selected = shallowRef(0)
watch(
  () => props.detail,
  (d) => (selected.value = Math.max(0, d?.players.findIndex((p) => p.puuid === props.puuid) ?? 0)),
  { immediate: true },
)

const TABS = [
  { id: 'scoreboard', label: tk('Scoreboard'), timeline: false },
  { id: 'breakdown', label: tk('Breakdown'), timeline: false },
  { id: 'gold', label: tk('Gold'), timeline: true },
  { id: 'timeline', label: tk('Timeline'), timeline: true },
  { id: 'build', label: tk('Build'), timeline: false },
] as const
type TabId = (typeof TABS)[number]['id']
const tab = shallowRef<TabId>('scoreboard')
/** Gold needs the per-minute frames; Timeline also needs events (old stored games have none). */
const tabs = computed(() => TABS.filter((x) => !x.timeline || (props.detail?.timeline && (x.id !== 'timeline' || hasEvents(props.detail)))))
watch(tabs, (list) => {
  if (!list.some((x) => x.id === tab.value)) tab.value = 'scoreboard'
})

const me = computed(() => props.detail?.players.find((p) => p.puuid === props.puuid))
const meta = computed(() => {
  const d = props.detail
  if (!d) return ''
  const when = date(d.creation, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return `${t('Patch {patch}', { patch: d.version.split('.').slice(0, 2).join('.') })} · ${when}${d.fromCore ? ' · invade.lol' : ''}`
})
const favorite = computed(() =>
  ui.favorites && props.detail && me.value ? gameFavorite(props.puuid, champName(me.value.championId), { ...props.detail, ...me.value, matchId: props.matchId }) : null,
)
</script>

<template>
  <div class="iv-md">
    <div v-if="error" class="iv-md-state">
      <p class="iv-error"><Icon name="x" :size="15" />{{ error }}</p>
      <button type="button" class="iv-btn sm" @click="$emit('retry')"><Icon name="refresh" :size="13" />{{ t('Try again') }}</button>
    </div>
    <div v-else-if="!detail" class="iv-md-loading" aria-busy="true">
      <div class="iv-md-skel-tabs"><span v-for="i in 5" :key="i" class="iv-skel" /></div>
      <div v-for="i in 6" :key="i" class="iv-skel iv-md-skel-row" />
    </div>
    <template v-else>
      <div class="iv-md-top">
        <nav class="iv-tabs">
          <button v-for="x in tabs" :key="x.id" type="button" :class="{ on: tab === x.id }" @click="tab = x.id">{{ t(x.label) }}</button>
        </nav>
        <p class="iv-md-meta">
          <span
            v-if="!detail.timeline && !loading"
            :title="detail.fromCore ? t('invade.lol has no timeline for this game: no graphs and no events.') : t('The League client has no timeline for this game: no graphs and no events.')"
            >{{ t('No timeline') }} · </span
          >{{ meta }}
        </p>
        <StarButton
          v-if="favorite"
          class="iv-md-star"
          :saved="ui.favorites!.has(favorite.key)"
          :label="`${t('Game')} · ${favorite.label}`"
          @toggle="ui.favorites!.toggle(favorite)"
        />
      </div>
      <div class="iv-md-body">
        <Scoreboard v-if="tab === 'scoreboard'" :detail="detail" :puuid="puuid" />
        <Breakdown v-else-if="tab === 'breakdown'" :detail="detail" :selected="selected" :me="me" @select="selected = $event" />
        <GoldChart v-else-if="tab === 'gold' && detail.timeline" :detail="detail" :timeline="detail.timeline" :selected="selected" :me="me" />
        <Timeline v-else-if="tab === 'timeline' && detail.timeline" :detail="detail" :timeline="detail.timeline" :selected="selected" :me="me" @select="selected = $event" />
        <BuildTab v-else-if="tab === 'build'" :detail="detail" :selected="selected" :me="me" @select="selected = $event" />
      </div>
    </template>
  </div>
</template>
