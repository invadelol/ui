<script setup lang="ts">
import { computed } from 'vue'
import { useNames } from '../context'
import { runePageView } from '../logic/runes'
import '../styles/base.css'

/**
 * A rune page: `p`/`s` start with the tree id followed by the picked runes, `m` = stat shards.
 * `compact`: the page as the client draws it, both trees in full with the chosen runes lit and the
 * others quiet, the shards as their own icons. `trees` overrides the tree layout it draws from.
 */
const props = withDefaults(defineProps<{ page: { p: number[]; s: number[]; m: number[] }; compact?: boolean; trees?: Record<number, number[][]> }>(), { compact: false, trees: undefined })
const { runeIcon, runeName, styleIcon, styleName } = useNames()

const primary = computed(() => props.page.p.slice(1))
const secondary = computed(() => props.page.s.slice(1))
const shards = computed(() => props.page.m.map(runeName).join(' · '))

const view = computed(() => (props.compact ? runePageView(props.page, props.trees) : null))
/** Read aloud: the chosen runes, the page's order. */
const chosen = computed(() => [...props.page.p.slice(1), ...props.page.s.slice(1), ...props.page.m].map(runeName).join(', '))
</script>

<template>
  <div v-if="view" class="iv-rp" role="img" :aria-label="chosen">
    <div v-for="(tree, ti) in [view.primary, view.secondary]" :key="ti" class="iv-rp-tree">
      <span class="iv-rp-name"><img v-if="styleIcon(tree.tree)" :src="styleIcon(tree.tree)" alt="" />{{ styleName(tree.tree) }}</span>
      <span v-for="(row, ri) in tree.rows" :key="ri" class="iv-rp-slots">
        <span v-for="slot in row" :key="slot.id" class="iv-rp-rune" :class="{ key: tree.keystones && ri === 0, on: slot.on }" :title="runeName(slot.id)">
          <img v-if="runeIcon(slot.id)" :src="runeIcon(slot.id)" alt="" loading="lazy" />
        </span>
      </span>
      <span v-if="ti === 1 && view.shards.length" class="iv-rp-shards">
        <span v-for="(row, ri) in view.shards" :key="ri" class="iv-rp-slots">
          <span v-for="(slot, si) in row" :key="si" class="iv-rp-rune shard" :class="{ on: slot.on }" :title="runeName(slot.id)">
            <img v-if="runeIcon(slot.id)" :src="runeIcon(slot.id)" alt="" loading="lazy" />
          </span>
        </span>
      </span>
    </div>
  </div>
  <div v-else class="iv-runes">
    <div class="iv-runes-row">
      <img class="tree" :src="styleIcon(page.p[0])" :alt="styleName(page.p[0])" />
      <img v-for="(id, i) in primary" :key="id" :class="{ key: i === 0 }" :src="runeIcon(id)" :alt="runeName(id)" :title="runeName(id)" />
    </div>
    <div class="iv-runes-row">
      <img class="tree" :src="styleIcon(page.s[0])" :alt="styleName(page.s[0])" />
      <img v-for="id in secondary" :key="id" :src="runeIcon(id)" :alt="runeName(id)" :title="runeName(id)" />
    </div>
    <div class="iv-runes-shards">{{ shards }}</div>
  </div>
</template>

<style>
.iv-runes {
  display: grid;
  gap: 3px;
}
.iv-runes-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.iv-runes-row img {
  width: 26px;
  height: 26px;
  border-radius: 50%;
}
.iv-runes-row img.tree {
  width: 18px;
  height: 18px;
  margin-right: 2px;
  opacity: 0.8;
}
.iv-runes-row img.key {
  width: 34px;
  height: 34px;
  background: radial-gradient(circle, rgb(var(--brand-rgb) / 0.35), rgb(var(--brand-rgb) / 0.08));
  box-shadow: 0 0 0 1px rgb(var(--brand-rgb) / 0.5);
}
.iv-runes-shards {
  margin-top: 2px;
  font-size: 10px;
  color: var(--text-2);
}

/* Compact: the client's page, the chosen runes lit, the rest quiet. */
.iv-rp {
  display: flex;
  gap: 22px;
}
.iv-rp-tree {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
}
.iv-rp-name {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  white-space: nowrap;
}
.iv-rp-name img {
  width: 20px;
  height: 20px;
}
.iv-rp-slots {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.iv-rp-rune {
  position: relative;
  display: block;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}
.iv-rp-rune img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0.22;
  filter: grayscale(1);
}
.iv-rp-rune.on img {
  opacity: 1;
  filter: none;
}
.iv-rp-rune.key {
  width: 38px;
  height: 38px;
}
.iv-rp-rune.key.on {
  background: var(--well);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.iv-rp-rune.shard {
  width: 18px;
  height: 18px;
}
.iv-rp-rune.shard.on {
  box-shadow: 0 0 0 1px var(--line-3);
}
.iv-rp-shards {
  display: grid;
  gap: 6px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.iv-rp-shards > .iv-rp-slots {
  padding: 0 4px;
}
</style>
