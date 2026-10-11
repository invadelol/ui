<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Icon, Panel, Segmented, Skeleton, Switch, Tabs, type IconName } from '../src'

const tab = shallowRef<'a' | 'b' | 'c'>('a')
const seg = shallowRef<'all' | 'solo' | 'flex'>('all')
const on = shallowRef(true)
const ICONS: IconName[] = ['home', 'user', 'chart', 'swords', 'target', 'live', 'film', 'overlay', 'search', 'refresh', 'star', 'eye', 'crown', 'coins', 'shield', 'trash']
</script>

<template>
  <Story title="Primitives" :layout="{ type: 'single', iframe: true }">
    <Variant title="Buttons and controls">
      <div class="story">
        <div class="story-row">
          <Button variant="primary">Update</Button>
          <Button><Icon name="refresh" :size="14" />Try again</Button>
          <Button variant="ghost">My profile</Button>
          <Button variant="danger">Delete</Button>
          <Button size="sm">Small</Button>
          <Button icon-only title="Search"><Icon name="search" :size="16" /></Button>
          <Button disabled>Disabled</Button>
        </div>
        <div class="story-row">
          <Segmented v-model="seg" :options="[{ id: 'all', label: 'All' }, { id: 'solo', label: 'Solo/Duo' }, { id: 'flex', label: 'Flex' }]" />
          <Segmented v-model="seg" size="sm" :options="[{ id: 'all', label: 'All' }, { id: 'solo', label: 'Solo/Duo' }, { id: 'flex', label: 'Flex' }]" />
          <Switch v-model="on" label="Record all PC sound" />
          <select class="iv-select"><option>All champions</option><option>Ahri</option></select>
        </div>
        <Tabs v-model="tab" :tabs="[{ id: 'a', label: 'Scoreboard' }, { id: 'b', label: 'Breakdown' }, { id: 'c', label: 'Gold' }]" />
      </div>
    </Variant>

    <Variant title="Panel, table, badges">
      <div class="story" style="max-width: 560px">
        <Panel title="Champions" meta="Last 20 games" style="padding: 12px 16px 14px">
          <table class="iv-table">
            <thead>
              <tr><th>Champion</th><th class="num">Games</th><th class="num">Win</th></tr>
            </thead>
            <tbody>
              <tr><td>Veigar</td><td class="num">12</td><td class="num">58%</td></tr>
              <tr class="self"><td>Ahri</td><td class="num">8</td><td class="num">50%</td></tr>
              <tr><td>Syndra</td><td class="num">4</td><td class="num">25%</td></tr>
            </tbody>
          </table>
        </Panel>
        <div class="story-row">
          <span class="iv-badge">Most damage</span>
          <span class="iv-badge brand">You</span>
          <span class="iv-badge gold">MVP</span>
          <span class="iv-badge win">Victory</span>
          <span class="iv-badge loss">Defeat</span>
          <span class="iv-form"><i class="w" /><i class="w" /><i class="l" /><i class="r" /><i class="w" /><i class="l" /></span>
          <span><b class="iv-fig" style="font-size: 28px">64</b><span class="iv-unit">LP</span></span>
          <span class="iv-up">+19</span>
          <span class="iv-down">−21</span>
          <span class="iv-label">Label</span>
        </div>
        <p class="iv-error"><Icon name="x" :size="15" />The League client could not load this.</p>
        <Skeleton width="60%" height="12px" />
      </div>
    </Variant>

    <Variant title="Icons">
      <div class="story story-row" style="color: var(--text-2)">
        <span v-for="n in ICONS" :key="n" :title="n"><Icon :name="n" :size="20" /></span>
      </div>
    </Variant>
  </Story>
</template>
