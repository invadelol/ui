<script setup lang="ts">
import { computed } from 'vue'
import { useFormat, useInvadeUi, useNames } from '../context'
import { hideBroken } from '../dom'
import { RUNE_SLOTS } from '../logic/detail'
import { tk } from '../logic/i18n'
import type { MatchDetail, PlayerView } from '../logic/types'
import PlayerPicker from './PlayerPicker.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/detail.css'

/**
 * One player's kit: the rune page with the runes not taken dimmed, final items and summoner
 * spells, and the facts no other tab shows (wards, crowd control, objectives, sprees, leads at
 * 15). A fact the source does not record is left out. Match histories keep no purchase or skill
 * order for these games.
 */
const props = defineProps<{ detail: MatchDetail; selected: number; me?: PlayerView }>()
const emit = defineEmits<{ select: [index: number] }>()
const { t } = useInvadeUi()
const { compact, signedGold } = useFormat()
const { itemIcon, itemName, runeIcon, runeName, spellIcon, spellName, styleIcon, styleName } = useNames()

const p = computed(() => props.detail.players[props.selected])
const taken = computed(() => new Set(p.value.perks))
/** Primary tree: every slot; secondary tree: the three rows under the keystones. */
const trees = computed(() => {
  const [primary, secondary] = p.value.styles
  return [
    { id: primary, rows: RUNE_SLOTS[primary] ?? null, fallback: p.value.perks.slice(0, 4) },
    { id: secondary, rows: RUNE_SLOTS[secondary]?.slice(1) ?? null, fallback: p.value.perks.slice(4, 6) },
  ].filter((x) => x.id > 0)
})
const MULTI = ['', '', tk('Double kill'), tk('Triple kill'), tk('Quadra kill'), tk('Penta kill')]
const facts = computed(() => {
  const x = p.value
  const out: { label: string; value: string }[] = [
    { label: t('Wards'), value: t('{placed} placed · {killed} destroyed · {control} control', { placed: x.wardsPlaced, killed: x.wardsKilled, control: x.controlWards }) },
  ]
  if (x.ccTime !== null) out.push({ label: t('Crowd control'), value: t('{n} s', { n: x.ccTime }) })
  out.push({ label: t('Objective damage'), value: t('{n} · {towers} to towers', { n: compact(x.objectiveDamage), towers: compact(x.turretDamage) }) })
  if (x.largestSpree !== null) out.push({ label: t('Largest killing spree'), value: String(x.largestSpree) })
  if (x.largestMulti !== null && x.largestMulti > 1) out.push({ label: t('Largest multikill'), value: t(MULTI[Math.min(5, x.largestMulti)]) })
  if (x.gold15 !== null || x.xp15 !== null || x.cs15 !== null) {
    const parts = [
      x.gold15 !== null ? t('{n} gold', { n: signedGold(x.gold15) }) : '',
      x.xp15 !== null ? t('{n} XP', { n: signedGold(x.xp15) }) : '',
      x.cs15 !== null ? t('{n} CS', { n: `${x.cs15 > 0 ? '+' : ''}${x.cs15}` }) : '',
    ].filter(Boolean)
    out.push({ label: t('Lead at 15 min'), value: parts.join(' · ') })
  }
  return out
})
</script>

<template>
  <div class="iv-bd">
    <PlayerPicker :detail="detail" :selected="selected" :me="me" @select="emit('select', $event)" />
    <div class="iv-bd-grid">
      <section v-if="trees.length && p.perks[0]" class="iv-bd-runes">
        <h4 class="iv-label">{{ t('Runes') }}</h4>
        <div v-for="(tree, k) in trees" :key="tree.id" class="iv-bd-tree" :class="{ second: k }">
          <p class="iv-bd-tree-name"><img :src="styleIcon(tree.id)" alt="" @error="hideBroken" />{{ styleName(tree.id) }}</p>
          <template v-if="tree.rows">
            <div v-for="(row, r) in tree.rows" :key="r" class="iv-bd-slot" :class="{ keys: !k && !r }">
              <img v-for="id in row" :key="id" :src="runeIcon(id)" :alt="runeName(id)" :title="runeName(id)" :class="{ off: !taken.has(id) }" @error="hideBroken" />
            </div>
          </template>
          <div v-else class="iv-bd-slot">
            <img v-for="id in tree.fallback" :key="id" :src="runeIcon(id)" :alt="runeName(id)" :title="runeName(id)" @error="hideBroken" />
          </div>
        </div>
      </section>

      <section class="iv-bd-kit">
        <h4 class="iv-label">{{ t('Items') }}</h4>
        <div class="iv-bd-items">
          <template v-for="(id, i) in p.items" :key="i">
            <img v-if="id" :src="itemIcon(id)" :alt="itemName(id)" :title="itemName(id)" :class="{ trinket: i === 6 }" @error="hideBroken" />
            <i v-else :class="{ trinket: i === 6 }" />
          </template>
        </div>
        <h4 class="iv-label">{{ t('Summoner spells') }}</h4>
        <div class="iv-bd-spells">
          <span v-for="(s, i) in p.spells" :key="i"><img :src="spellIcon(s)" alt="" @error="hideBroken" />{{ spellName(s) }}</span>
        </div>
      </section>

      <section class="iv-bd-facts">
        <h4 class="iv-label">{{ t('Details') }}</h4>
        <dl>
          <div v-for="f in facts" :key="f.label">
            <dt>{{ f.label }}</dt>
            <dd>{{ f.value }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
