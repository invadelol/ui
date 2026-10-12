<script setup lang="ts">
import { computed } from 'vue'
import { useFormat, useInvadeUi, useNames, type LinkTarget } from '../context'
import { hideBroken } from '../dom'
import { riotId, side, teamsOf } from '../logic/detail'
import { BADGES, positionName, topBadges } from '../logic/labels'
import type { MatchDetail, PlayerView, TeamView } from '../logic/types'
import Link from './Link.vue'
import ObjectiveIcon, { type ObjectiveIconName } from './ObjectiveIcon.vue'
import PerfDial from './PerfDial.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/detail.css'

/**
 * Both teams in one table, the viewed player's team first. The team line carries the result
 * word in its colour (the only result colour), objectives with counts, bans and totals; each
 * player row follows the table spec, the viewed player's row in brand. A name links to that
 * player (through the host's `linkTo` / `onOpen`).
 */
const props = defineProps<{ detail: MatchDetail; puuid: string }>()

const ui = useInvadeUi()
const { t } = ui
const { compact, kdaRatio, num, ordinal, pct, score100, signedGold } = useFormat()
const { champIcon, champName, itemIcon, runeIcon, runeName, spellIcon, spellName, styleIcon, styleName } = useNames()

const viewer = computed(() => props.detail.players.find((p) => p.puuid === props.puuid))
const teams = computed(() => teamsOf(props.detail, viewer.value))
const maxDamage = computed(() => Math.max(1, ...props.detail.players.map((p) => p.damage)))
const sr = computed(() => props.detail.mapId === 11)
const arena = computed(() => props.detail.players.some((p) => p.placement > 0))

/** Objectives with their count; a count the source does not keep (grubs) is left out. */
function objectives(team: TeamView) {
  const list: { id: ObjectiveIconName; label: string; n: number | null }[] = [
    { id: 'tower', label: t('Towers'), n: team.towers },
    { id: 'dragon', label: t('Dragons'), n: team.dragons },
    { id: 'baron', label: t('Barons'), n: team.barons },
    { id: 'grubs', label: t('Voidgrubs'), n: team.grubs },
    { id: 'herald', label: t('Rift Herald'), n: team.heralds },
    { id: 'inhib', label: t('Inhibitors'), n: team.inhibitors },
  ]
  return list.filter((o) => o.n !== null)
}
const result = (team: TeamView, placement: number) =>
  arena.value && placement ? t('{place} place', { place: ordinal(placement) }) : props.detail.remake ? t('Remake') : team.win ? t('Victory') : t('Defeat')
const sideName = (teamId: number) => (side(teamId) === 'blue' ? t('Blue side') : side(teamId) === 'red' ? t('Red side') : '')
const bans = (team: TeamView) => team.bans.filter((b) => b > 0)

/** A lead at 15 minutes is worth a colour from 1000 gold (the "Lane won" mark). */
const leadClass = (g: number) => (g >= 1000 ? 'iv-up' : g <= -1000 ? 'iv-down' : '')

/** Another player's profile; none for the viewed player or an unknown one. */
const target = (p: PlayerView): LinkTarget | null =>
  p.puuid && p.puuid !== props.puuid ? { kind: 'player', puuid: p.puuid, gameName: p.gameName, tagLine: p.tagLine } : null
</script>

<template>
  <div class="iv-sb-wrap">
    <table class="iv-table iv-sb">
      <colgroup>
        <col class="iv-sb-c-who" />
        <col class="iv-sb-c-name" />
        <col class="iv-sb-c-kda" />
        <col class="iv-sb-c-dmg" />
        <col class="iv-sb-c-gold" />
        <col class="iv-sb-c-cs" />
        <col class="iv-sb-c-vis" />
        <col class="iv-sb-c-items" />
        <col class="iv-sb-c-score" />
      </colgroup>
      <thead>
        <tr>
          <th colspan="2">{{ t('Player') }}</th>
          <th class="num">{{ t('KDA') }}</th>
          <th class="num">{{ t('Damage') }}</th>
          <th class="num">{{ t('Gold') }}</th>
          <th class="num">{{ t('CS') }}</th>
          <th class="num iv-sb-vis">{{ t('Vision') }}</th>
          <th>{{ t('Items') }}</th>
          <th class="num" :title="t('Invade score')">{{ t('Score') }}</th>
        </tr>
      </thead>
      <tbody v-for="{ team, players, placement } in teams" :key="team.teamId" :class="team.win ? 'won' : 'lost'">
        <tr class="iv-sb-team">
          <td colspan="9">
            <div class="iv-sb-team-line">
              <b class="iv-sb-res" :class="detail.remake ? '' : team.win ? 'win' : 'loss'">{{ result(team, placement) }}</b>
              <span v-if="sideName(team.teamId)" class="iv-sb-side">{{ sideName(team.teamId) }}</span>
              <span v-if="sr" class="iv-sb-obj">
                <span v-for="o in objectives(team)" :key="o.id" :title="o.label" :class="{ none: !o.n }"><ObjectiveIcon :name="o.id" :size="14" />{{ o.n }}</span>
              </span>
              <span v-if="bans(team).length" class="iv-sb-bans" :title="t('Bans')">
                <img v-for="(b, i) in bans(team)" :key="i" :src="champIcon(b)" :alt="champName(b)" :title="t('Banned: {champion}', { champion: champName(b) })" />
              </span>
              <span class="iv-sb-tot">
                {{ team.kills }} / {{ team.deaths }} / {{ team.assists }}
                <span class="iv-sb-dot">·</span>
                {{ t('{gold} gold', { gold: compact(team.gold) }) }}
              </span>
            </div>
          </td>
        </tr>
        <tr v-for="p in players" :key="p.participantId" :class="{ self: p.puuid === puuid }">
          <td class="iv-sb-who">
            <span class="iv-sb-portrait" :title="champName(p.championId)">
              <span class="iv-sb-art"><img :src="champIcon(p.championId)" alt="" /></span>
              <em>{{ p.level }}</em>
            </span>
            <span class="iv-sb-load">
              <img v-for="(s, i) in p.spells" :key="i" :src="spellIcon(s)" :alt="spellName(s)" :title="spellName(s)" @error="hideBroken" />
              <img v-if="p.perks[0]" :src="runeIcon(p.perks[0])" :title="runeName(p.perks[0])" alt="" class="key" @error="hideBroken" />
              <i v-else />
              <img v-if="p.styles[1]" :src="styleIcon(p.styles[1])" :title="styleName(p.styles[1])" alt="" class="sub" @error="hideBroken" />
            </span>
          </td>
          <td class="iv-sb-name">
            <span class="iv-sb-line">
              <Link class="iv-sb-link" :to="target(p)" :title="riotId(p) || champName(p.championId)">
                {{ p.gameName || champName(p.championId) }}<small v-if="p.tagLine">#{{ p.tagLine }}</small>
              </Link>
              <span v-if="p.puuid && p.puuid === ui.viewer.value && p.puuid !== puuid" class="iv-badge brand">{{ t('You') }}</span>
            </span>
            <span class="iv-sb-line iv-sb-sub">
              <small>
                <template v-if="p.position">{{ positionName(p.position, t) }}</template>
                <template v-else>{{ champName(p.championId) }}</template>
                <template v-if="p.gold15 !== null">
                  · <span :class="leadClass(p.gold15)" :title="t('Gold lead over the lane opponent at 15 minutes')">{{ t('{gold} gold @15', { gold: signedGold(p.gold15) }) }}</span>
                </template>
              </small>
              <span v-for="b in topBadges(p.badges)" :key="b" class="iv-badge" :title="t(BADGES[b].tip)">{{ t(BADGES[b].label) }}</span>
            </span>
          </td>
          <td class="num iv-sb-kda">
            <b>{{ p.kills }}<i>/</i>{{ p.deaths }}<i>/</i>{{ p.assists }}</b>
            <small>{{ kdaRatio(p.kills, p.deaths, p.assists) }} · {{ pct(p.kp) }} {{ t('KP') }}</small>
          </td>
          <td class="num iv-sb-dmg" :title="`${num(p.damage)} · ${t('{share} of the team', { share: pct(p.damageShare) })}`">
            <b>{{ compact(p.damage) }}</b>
            <i class="iv-sb-bar"><em :style="{ width: `${(p.damage / maxDamage) * 100}%` }" /></i>
          </td>
          <td class="num" :title="t('{share} of the team', { share: pct(p.goldShare) })">
            <b>{{ compact(p.gold) }}</b>
          </td>
          <td class="num">
            <b>{{ p.cs }}</b>
            <small>{{ num(p.csMin, 1) }}</small>
          </td>
          <td class="num iv-sb-vis" :title="t('{placed} placed · {killed} destroyed · {control} control wards', { placed: p.wardsPlaced, killed: p.wardsKilled, control: p.controlWards })">
            <b>{{ p.vision }}</b>
          </td>
          <td>
            <span class="iv-sb-items">
              <template v-for="(id, i) in p.items" :key="i">
                <img v-if="id" :src="itemIcon(id)" alt="" :class="{ trinket: i === 6 }" @error="hideBroken" />
                <i v-else :class="{ trinket: i === 6 }" />
              </template>
            </span>
          </td>
          <td class="num iv-sb-score">
            <span v-if="p.score !== null" class="iv-sb-perf">
              <span v-if="p.badges.includes('mvp')" class="iv-badge gold" :title="t(BADGES.mvp.tip)">{{ t('MVP') }}</span>
              <span v-else-if="p.badges.includes('ace')" class="iv-badge" :title="t(BADGES.ace.tip)">{{ t('ACE') }}</span>
              <small v-else>{{ ordinal(p.rank) }}</small>
              <PerfDial :score="score100(p.score)" :rank="p.rank" size="sm" />
            </span>
            <span v-else class="iv-pf-dim">–</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
