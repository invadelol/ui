<script setup lang="ts">
import { computed } from 'vue'
import { useNames } from '../context'
import '../styles/base.css'

/** A rune page: `p`/`s` start with the tree id followed by the picked runes, `m` = stat shards. */
const props = defineProps<{ page: { p: number[]; s: number[]; m: number[] } }>()
const { runeIcon, runeName, styleIcon, styleName } = useNames()

const primary = computed(() => props.page.p.slice(1))
const secondary = computed(() => props.page.s.slice(1))
const shards = computed(() => props.page.m.map(runeName).join(' · '))
</script>

<template>
  <div class="iv-runes">
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
</style>
