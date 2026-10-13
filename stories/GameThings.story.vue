<script setup lang="ts">
import { ChampIcon, Logo, ObjectiveIcon, PerfDial, RankCrest, RoleIcon, RunePage, TrendLine, type ObjectiveIconName } from '../src'
import type { Position } from '../src/logic'

const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
const LANES: Position[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']
const OBJECTIVES: ObjectiveIconName[] = ['tower', 'inhib', 'dragon', 'grubs', 'herald', 'baron']
</script>

<template>
  <Story title="Game things" :layout="{ type: 'single', iframe: true }">
    <Variant title="Performance dial">
      <div class="story">
        <div class="story-row">
          <PerfDial :score="94" tag="mvp" />
          <PerfDial :score="84" :rank="2" />
          <PerfDial :score="66" :rank="3" />
          <PerfDial :score="41" :rank="5" />
          <PerfDial :score="27" tag="ace" />
          <PerfDial :score="8" :rank="10" />
          <PerfDial :score="null" />
        </div>
        <div class="story-row">
          <PerfDial :score="94" size="sm" />
          <PerfDial :score="84" size="sm" />
          <PerfDial :score="41" size="sm" />
          <PerfDial :score="8" size="sm" />
          <PerfDial :score="null" size="sm" />
        </div>
      </div>
    </Variant>

    <Variant title="Rank crests">
      <div class="story">
        <div class="story-row"><RankCrest v-for="tier in TIERS" :key="tier" :tier="tier" :size="24" /><RankCrest :size="24" /></div>
        <div class="story-row"><RankCrest v-for="tier in TIERS" :key="tier" :tier="tier" :size="56" /></div>
      </div>
    </Variant>

    <Variant title="Champions, runes, roles">
      <div class="story">
        <div class="story-row">
          <ChampIcon :id="45" :size="44" :level="16" />
          <ChampIcon :id="103" :size="32" />
          <ChampIcon :id="157" :size="24" dim />
          <ChampIcon :size="32" />
        </div>
        <RunePage :page="{ p: [8100, 8112, 8139, 8140, 8105], s: [8200, 8226, 8237], m: [5008, 5008, 5011] }" />
        <div class="story-row" style="color: var(--text-2)">
          <RoleIcon v-for="l in LANES" :key="l" :lane="l" />
          <ObjectiveIcon v-for="o in OBJECTIVES" :key="o" :name="o" :size="18" />
          <Logo :size="24" word />
        </div>
      </div>
    </Variant>

    <Variant title="Trend line">
      <div class="story" style="max-width: 320px">
        <TrendLine :values="[2150, 2172, 2153, 2174, 2194, 2176, 2156, 2179, 2198, 2177]" :height="44" area />
        <TrendLine :values="[6.1, 7.4, 5.9, 8.2, 7.7, 6.8, 7.9]" :baseline="7" :band="5" :height="22" />
      </div>
    </Variant>
  </Story>
</template>
