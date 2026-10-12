<script setup lang="ts">
import { computed } from 'vue'
import { gameFavorite, useFormat, useInvadeUi, useNames } from '../context'
import { hideBroken } from '../dom'
import { BADGES, queueName, queueShort, topBadges } from '../logic/labels'
import type { Badge, MatchSummary, ScoreRow } from '../logic/types'
import Icon from './Icon.vue'
import PerfDial from './PerfDial.vue'
import StarButton from './StarButton.vue'
import '../styles/base.css'
import '../styles/primitives.css'

/**
 * One game in one line. The result is the row's left edge and tint, nothing else; figures stay
 * white. The whole row toggles the detail, which the parent renders right below it. Opponent,
 * kill participation and badges come from the score row when the parent does not pass them (they
 * are computed from the same full game).
 *
 * The row is its own size container: from ~560px to 1600px it drops the matchup, then farm, then
 * items, instead of squeezing every column.
 *
 * With `puuid` and a host favorites store, a star in the row's right padding saves the game. It is
 * the row button's sibling (a button cannot hold another), and hover is read on the wrapper so
 * pointing at the star keeps the row lit. An open row leaves the star to the detail's header.
 */
const props = withDefaults(
  defineProps<{
    game: MatchSummary
    /** None (unscored, or not yet): no dial, the column keeps its width. */
    score?: ScoreRow | null
    /** LP gained or lost, when known. */
    lp?: number | null
    /** Lane opponent's champion id, when known (default: from `score`). */
    opponent?: number | null
    /** Kill participation 0‥1, when known (default: from `score`). */
    kp?: number | null
    /** Earned badges; at most two are shown (default: from `score`). */
    badges?: Badge[]
    open?: boolean
    /** 44px variant for lists beside other content (dashboard). */
    compact?: boolean
    /** Whose game this is: shows the favorite star (with a host favorites store). */
    puuid?: string | null
  }>(),
  { score: null, lp: null, opponent: null, kp: null, badges: () => [], open: false, compact: false, puuid: null },
)
defineEmits<{ toggle: [] }>()

const ui = useInvadeUi()
const { t } = ui
const { compact: compactNum, date, kdaRatio, mmss, num, ordinal, pct, score100, signedLp } = useFormat()
const { champIcon, champName, itemIcon, itemName, runeIcon, runeName, spellIcon, spellName, styleIcon, styleName } = useNames()

const g = computed(() => props.game)
const result = computed(() => (g.value.remake ? 'remake' : g.value.win ? 'win' : 'loss'))
const queue = computed(() => (g.value.queueId === 420 ? t('Ranked Solo') : queueName(g.value.queueId, t)))
/** Narrow rows name the queue by its filter ("Solo/Duo", "Normal"), so nothing is cut. */
const queueBrief = computed(() => queueShort(g.value.queueId, t))
/** Second line of the game column: LP when known, else the result in words. */
const outcome = computed(() => {
  if (g.value.remake) return t('Remake')
  if (g.value.placement) return t('{place} place', { place: ordinal(g.value.placement) })
  if (props.lp != null) return `${signedLp(props.lp)} ${t('LP')}`
  return g.value.win ? t('Win') : t('Loss')
})
const opp = computed(() => props.opponent ?? props.score?.opponent ?? null)
const killShare = computed(() => props.kp ?? props.score?.kp ?? null)
const shownBadges = computed(() => topBadges(props.badges.length ? props.badges : props.score?.badges))
const tag = computed(() => props.score?.tag || '')
/** Compact rows show the placement beside the small dial (the full dial carries it inside). */
const place = computed(() => (!props.score ? '' : tag.value === 'mvp' ? t('MVP') : tag.value === 'ace' ? t('ACE') : ordinal(props.score.rank)))
const started = computed(() => date(g.value.creation, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))
const favorite = computed(() => (ui.favorites && props.puuid ? gameFavorite(props.puuid, champName(g.value.championId), g.value) : null))
</script>

<template>
  <div class="iv-mr-wrap">
    <button type="button" class="iv-mr" :class="[result, { open, compact, starred: favorite }]" :aria-expanded="compact ? undefined : open" @click="$emit('toggle')">
      <span class="iv-mr-grid">
        <span class="iv-mr-champ" :title="champName(g.championId)">
          <span class="iv-mr-portrait"><img :src="champIcon(g.championId)" alt="" /></span>
          <em v-if="!compact">{{ g.level }}</em>
        </span>

        <span v-if="!compact" class="iv-mr-load">
          <img v-for="(s, i) in g.spells.slice(0, 2)" :key="`s${i}`" :src="spellIcon(s)" :alt="spellName(s)" :title="spellName(s)" @error="hideBroken" />
          <img v-if="g.keystone" :src="runeIcon(g.keystone)" :alt="runeName(g.keystone)" :title="runeName(g.keystone)" class="key" @error="hideBroken" />
          <i v-else />
          <img v-if="g.subStyle" :src="styleIcon(g.subStyle)" :alt="styleName(g.subStyle)" :title="styleName(g.subStyle)" class="sub" @error="hideBroken" />
          <i v-else />
        </span>

        <span class="iv-mr-game" :title="started">
          <b><span class="iv-mr-q">{{ queue }}</span><span class="iv-mr-q brief">{{ queueBrief }}</span></b>
          <small><span class="iv-mr-outcome" :class="{ lp: lp != null && !g.remake && !g.placement }">{{ outcome }}</span> · {{ mmss(g.duration) }}</small>
        </span>

        <span class="iv-mr-kda">
          <b>{{ g.kills }}<i>/</i>{{ g.deaths }}<i>/</i>{{ g.assists }}</b>
          <small>
            {{ kdaRatio(g.kills, g.deaths, g.assists) }} {{ t('KDA') }}<span v-if="killShare != null" class="iv-mr-kp"> · {{ pct(killShare) }} {{ t('KP') }}</span>
          </small>
        </span>

        <!-- Compact rows show farm (and the KDA line above) only when they have the width for it. -->
        <span class="iv-mr-farm">
          <b>{{ num(g.csMin, 1) }}<span class="iv-unit">{{ t('CS/min') }}</span></b>
          <small>{{ compactNum(g.damage) }} {{ t('dmg') }}</small>
        </span>

        <template v-if="!compact">
          <span class="iv-mr-items" :class="{ tagged: shownBadges.length }">
            <span class="iv-mr-well">
              <template v-for="(id, i) in g.items.slice(0, 7)" :key="i">
                <img v-if="id" :src="itemIcon(id)" :alt="itemName(id)" :title="itemName(id)" :class="{ trinket: i === 6 }" @error="hideBroken" />
                <i v-else :class="{ trinket: i === 6 }" />
              </template>
            </span>
            <span v-if="shownBadges.length" class="iv-mr-badges">
              <span v-for="b in shownBadges" :key="b" class="iv-badge" :title="t(BADGES[b].tip)">{{ t(BADGES[b].label) }}</span>
            </span>
          </span>

          <span class="iv-mr-vs">
            <template v-if="opp">
              <small>{{ t('vs') }}</small>
              <span class="iv-mr-portrait" :title="t('Lane opponent: {champion}', { champion: champName(opp) })">
                <img :src="champIcon(opp)" :alt="champName(opp)" />
              </span>
            </template>
          </span>
        </template>

        <span class="iv-mr-score">
          <small v-if="compact && place" class="iv-mr-place" :class="tag">{{ place }}</small>
          <PerfDial v-if="score" :score="score100(score.score)" :rank="score.rank" :tag="tag" :size="compact ? 'sm' : 'md'" />
        </span>

        <Icon v-if="!compact" name="down" :size="15" class="iv-mr-chev" />
      </span>
    </button>
    <StarButton
      v-if="favorite"
      class="iv-mr-star"
      :saved="ui.favorites!.has(favorite.key)"
      :label="`${t('Game')} · ${favorite.label}`"
      @toggle="ui.favorites!.toggle(favorite)"
    />
  </div>
</template>

<style>

/* --- the row ------------------------------------------------------------------------------------ */
.iv-mr-wrap {
  position: relative;
}
.iv-mr {
  --edge: transparent;
  --tint: transparent;
  --tint-end: transparent;
  position: relative;
  display: block;
  width: 100%;
  height: auto;
  padding: 0;
  font: inherit;
  color: var(--text-1);
  text-align: left;
  background: linear-gradient(90deg, var(--tint), var(--tint-end) 45%), var(--surface-1);
  border: 0;
  border-radius: var(--r-sm);
  box-shadow: var(--row);
  cursor: pointer;
  container: mr / inline-size;
  /* Its own stacking context: the hover wash (::after, z-index -1) sits over the row's background
     and under its content. */
  isolation: isolate;
}
/* Hover: a faint wash fades in over a closed row, nothing moves. Only the overlay's opacity
   changes, so the row (portraits, items, the dial) is neither laid out nor re-rasterized again:
   the 1px lift this replaces made WebKit rebuild the row's layer and re-render its text, at
   fractional offsets, on every hover. */
.iv-mr::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: var(--glint);
  opacity: 0;
  transition: opacity 180ms ease-out;
  pointer-events: none;
}
.iv-mr-wrap:hover > .iv-mr:not(.open)::after {
  opacity: 1;
}
/* The result: a straight edge and a tint of the same hue that starts at the edge and fades out, so
   each row has a direction instead of a painted floor. */
.iv-mr::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--edge);
  border-radius: var(--r-sm) 0 0 var(--r-sm);
}
.iv-mr.win {
  --edge: var(--win);
  --tint: rgb(var(--win-rgb) / 0.15);
  --tint-end: rgb(var(--win-rgb) / 0);
}
.iv-mr.loss {
  --edge: var(--loss);
  --tint: rgb(var(--loss-rgb) / 0.15);
  --tint-end: rgb(var(--loss-rgb) / 0);
}
.iv-mr.remake {
  opacity: 0.6;
}
.iv-mr.open {
  background: linear-gradient(90deg, var(--tint), var(--tint-end) 45%), var(--surface-2);
}
.iv-mr.open {
  border-radius: var(--r-sm) var(--r-sm) 0 0;
}
.iv-mr.open::before {
  border-radius: var(--r-sm) 0 0 0;
}
.iv-mr:focus-visible {
  outline: none;
  box-shadow: var(--row), var(--focus);
}
.iv-mr img {
  display: block;
}

.iv-mr-grid {
  display: grid;
  /* Text columns grow to a reading width, then the spare room goes in front of the items, which
     stay next to the matchup and the score. */
  grid-template-columns: 44px 42px minmax(88px, 172px) minmax(124px, 196px) minmax(76px, 140px) minmax(max-content, 1fr) 50px 84px 15px;
  align-items: center;
  column-gap: 14px;
  min-height: 64px;
  padding: 0 14px 0 17px;
}

/* Portraits: Riot's square art, cropped a little to drop its baked border, in a lit ring. */
.iv-mr-portrait {
  display: block;
  overflow: hidden;
  border-radius: var(--r-sm);
  box-shadow: var(--portrait);
}
.iv-mr-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.08);
}
.iv-mr-champ {
  position: relative;
  width: 44px;
  height: 44px;
}
.iv-mr-champ .iv-mr-portrait {
  width: 100%;
  height: 100%;
}
.iv-mr-champ em {
  position: absolute;
  right: -3px;
  bottom: -3px;
  min-width: 17px;
  padding: 0 3px;
  font-size: 10.5px;
  font-style: normal;
  font-weight: 600;
  line-height: 15px;
  text-align: center;
  color: var(--text-2);
  background: var(--solid-1);
  border-radius: var(--r-xs);
}
.iv-mr-load {
  display: grid;
  grid-template-columns: 20px 20px;
  grid-template-rows: 20px 20px;
  gap: 2px;
  place-items: center;
}
.iv-mr-load img {
  width: 20px;
  height: 20px;
  border-radius: var(--r-xs);
}
.iv-mr-load img.key {
  width: 21px;
  height: 21px;
  border-radius: 0;
}
.iv-mr-load img.sub {
  width: 14px;
  height: 14px;
  border-radius: 0;
  opacity: 0.8;
}

.iv-mr-game,
.iv-mr-kda,
.iv-mr-farm,
.iv-mr-score {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.iv-mr-game b,
.iv-mr-farm b {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 16px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.iv-mr small {
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  line-height: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text-3);
}
.iv-mr-outcome.lp {
  font-weight: 600;
  color: var(--text-2);
}
.iv-mr-kda b {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 17px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.iv-mr-kda b i {
  margin: 0 4px;
  font-style: normal;
  font-weight: 400;
  color: var(--text-4);
}
.iv-mr-farm .iv-unit {
  margin-left: 4px;
  font-size: 11px;
}

.iv-mr-items {
  display: grid;
  gap: 4px;
  justify-items: start;
  justify-self: end;
  min-width: 0;
}
.iv-mr-well {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--well);
  border-radius: var(--r-sm);
}
.iv-mr-well img,
.iv-mr-well i {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: var(--r-xs);
}
.iv-mr-well i {
  background: var(--glint);
}
.iv-mr-well .trinket {
  margin-left: 4px;
}
.iv-mr-badges {
  display: flex;
  gap: 4px;
  max-width: 100%;
  overflow: hidden;
}

.iv-mr-vs {
  display: flex;
  align-items: center;
  gap: 6px;
}
.iv-mr-vs small {
  font-size: 11px;
  color: var(--text-4);
}
.iv-mr-vs .iv-mr-portrait {
  width: 28px;
  height: 28px;
  opacity: 0.85;
}

.iv-mr-score {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.iv-mr-chev {
  color: var(--text-4);
  transition: transform var(--t-base) var(--ease), color var(--t-fast);
}
.iv-mr-wrap:hover .iv-mr-chev {
  color: var(--text-2);
}
.iv-mr.open .iv-mr-chev {
  transform: rotate(180deg);
}

@container mr (max-width: 800px) {
  .iv-mr-grid {
    grid-template-columns: 44px 42px minmax(86px, 172px) minmax(120px, 196px) minmax(74px, 140px) minmax(max-content, 1fr) 48px 15px;
    column-gap: 13px;
  }
  .iv-mr-vs {
    display: none;
  }
}
@container mr (max-width: 690px) {
  .iv-mr-grid {
    grid-template-columns: 44px 42px minmax(84px, 1fr) minmax(116px, 1fr) max-content 48px 15px;
    column-gap: 12px;
  }
  .iv-mr-farm {
    display: none;
  }
  .iv-mr-well img,
  .iv-mr-well i {
    width: 20px;
    height: 20px;
  }
}
/* Items need ~615px with everything else at its minimum: below that they go, rather than push the
   chevron out of the row. */
@container mr (max-width: 620px) {
  .iv-mr-grid {
    grid-template-columns: 44px 42px minmax(0, 1fr) minmax(0, 1fr) 48px 15px;
  }
  .iv-mr-items {
    display: none;
  }
}

/* Narrow (a phone, a narrow tile): champion and loadout, the game, the full K/D/A over its ratio,
   the score. Nothing is cut: the queue takes its short name, the K/D/A its own width. */
.iv-mr-q.brief {
  display: none;
}
@container mr (max-width: 520px) {
  .iv-mr-q {
    display: none;
  }
  .iv-mr-q.brief {
    display: inline;
  }
  /* Two lines: the champion, the game, the K/D/A and the score; under them the loadout and the
     items, which a single phone-wide line has no room for. */
  .iv-mr:not(.compact) .iv-mr-grid {
    grid-template-columns: 40px max-content minmax(0, 1fr) max-content 48px;
    grid-template-rows: auto auto;
    gap: 8px 10px;
    padding: 10px 10px 10px 14px;
  }
  .iv-mr:not(.compact) .iv-mr-champ {
    width: 40px;
    height: 40px;
    grid-column: 1;
    grid-row: 1;
  }
  .iv-mr:not(.compact) .iv-mr-game {
    grid-column: 2 / 4;
    grid-row: 1;
  }
  .iv-mr:not(.compact) .iv-mr-kda {
    grid-column: 4;
    grid-row: 1;
  }
  .iv-mr:not(.compact) .iv-mr-score {
    grid-column: 5;
    grid-row: 1;
  }
  .iv-mr:not(.compact) .iv-mr-load {
    grid-column: 1 / 3;
    grid-row: 2;
    grid-template-columns: repeat(4, 16px);
    grid-template-rows: 16px;
    gap: 3px;
    justify-self: start;
  }
  .iv-mr:not(.compact) .iv-mr-load img {
    width: 16px;
    height: 16px;
  }
  .iv-mr:not(.compact) .iv-mr-load img.key {
    width: 17px;
    height: 17px;
  }
  .iv-mr:not(.compact) .iv-mr-load img.sub {
    width: 12px;
    height: 12px;
  }
  .iv-mr:not(.compact) .iv-mr-items {
    display: flex;
    align-items: center;
    gap: 6px;
    grid-column: 3 / -1;
    grid-row: 2;
    justify-self: start;
    max-width: 100%;
  }
  .iv-mr:not(.compact) .iv-mr-well {
    flex: none;
  }
  /* A badge shows whole or not at all: one that has no room wraps out of sight. */
  .iv-mr:not(.compact) .iv-mr-badges {
    flex-wrap: wrap;
    min-width: 0;
    height: 18px;
  }
  .iv-mr-well img,
  .iv-mr-well i {
    width: 18px;
    height: 18px;
  }
  .iv-mr-well .trinket {
    margin-left: 3px;
  }
  .iv-mr-kda b {
    font-size: 14px;
  }
  .iv-mr-kda b i {
    margin: 0 3px;
  }
  .iv-mr-kp,
  .iv-mr-chev {
    display: none;
  }
}

/* Compact (dashboard and side lists): champion, game, KDA, score; from ~480px the KDA ratio and
   kill participation, from ~600px farm and damage, so the row stays one unit as it widens. */
.iv-mr.compact .iv-mr-grid {
  min-height: 44px;
  grid-template-columns: 32px minmax(0, 1fr) auto 72px;
  column-gap: 12px;
  padding: 0 12px 0 14px;
}
.iv-mr.compact .iv-mr-champ {
  width: 32px;
  height: 32px;
}
.iv-mr.compact .iv-mr-game,
.iv-mr.compact .iv-mr-kda,
.iv-mr.compact .iv-mr-farm {
  gap: 1px;
}
.iv-mr.compact .iv-mr-kda {
  justify-items: end;
}
.iv-mr.compact .iv-mr-kda b,
.iv-mr.compact .iv-mr-farm b {
  font-size: 13px;
}
.iv-mr.compact small {
  font-size: 11.5px;
}
.iv-mr.compact .iv-mr-kda small,
.iv-mr.compact .iv-mr-farm {
  display: none;
}
.iv-mr.compact .iv-mr-score {
  gap: 6px;
}
.iv-mr.compact .iv-mr-place {
  overflow: visible;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-2);
}
.iv-mr.compact .iv-mr-place.mvp {
  color: var(--gold-c);
}
@container mr (min-width: 480px) {
  .iv-mr.compact .iv-mr-grid {
    grid-template-columns: 32px minmax(0, 1.2fr) minmax(0, 1fr) 72px;
    column-gap: 14px;
  }
  .iv-mr.compact .iv-mr-kda {
    justify-items: start;
  }
  .iv-mr.compact .iv-mr-kda small {
    display: block;
  }
}
@container mr (min-width: 600px) {
  .iv-mr.compact .iv-mr-grid {
    grid-template-columns: 32px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.8fr) 72px;
  }
  .iv-mr.compact .iv-mr-farm {
    display: grid;
  }
}

/* The star: in the right padding, shown on hover and once saved. */
.iv-mr.starred .iv-mr-grid {
  padding-right: 40px;
}
.iv-mr-wrap .iv-mr-star {
  position: absolute;
  top: 0;
  right: 6px;
  bottom: 0;
  margin: auto 0;
  transition: opacity 180ms ease-out, color var(--t-fast), background-color var(--t-fast);
}
.iv-mr-star:not(.saved):not(:focus-visible) {
  opacity: 0;
}
.iv-mr-wrap:hover .iv-mr-star {
  opacity: 1;
}
.iv-mr.open + .iv-mr-star {
  display: none;
}

/* --- day groups ----------------------------------------------------------------------------------- */
.iv-mr-day {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}
.iv-mr-day span {
  margin-left: auto;
  font-weight: 500;
  color: var(--text-3);
}
.iv-mr-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
