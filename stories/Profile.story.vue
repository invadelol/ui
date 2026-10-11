<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChampionTable, LpGraph, MatchDetailPanel, MatchList, PlayedWithPanel, PlayerHeader, ProfileLayout, RolesPanel } from '../src'
import { lpByGame, type Position, type QueueFilter } from '../src/logic'
import { detailOf, games, otherProfile, playedWith, profile, scores } from './fixtures'

const queue = shallowRef<QueueFilter>('all')
const champion = shallowRef(0)
const role = shallowRef<Position | ''>('')
const order = shallowRef<'recent' | 'champion'>('recent')
const lp = computed(() => lpByGame(profile.lp, games))
</script>

<template>
  <Story title="Profile" :layout="{ type: 'single', iframe: true }">
    <Variant title="Own profile">
      <div class="story">
        <ProfileLayout>
          <template #header><PlayerHeader :profile="profile" :games="games" /></template>
          <template #side>
            <LpGraph :points="profile.lp" :card="profile.card" />
            <ChampionTable v-model:champion="champion" :profile="profile" :games="games" :scores="scores" />
            <RolesPanel v-model:role="role" :lanes="profile.lanes" />
            <PlayedWithPanel :data="playedWith" />
          </template>
          <MatchList
            v-model:queue="queue"
            v-model:champion="champion"
            v-model:role="role"
            v-model:order="order"
            puuid="mock-self"
            :games="games"
            :scores="scores"
            :lp="lp"
            status="ready"
            more
          >
            <template #detail="{ game }"><MatchDetailPanel :detail="detailOf(game)" puuid="mock-self" /></template>
          </MatchList>
        </ProfileLayout>
      </div>
    </Variant>

    <Variant title="Another player">
      <div class="story">
        <ProfileLayout>
          <template #header><PlayerHeader :profile="otherProfile" :games="games.slice(4)" /></template>
          <template #side>
            <ChampionTable v-model:champion="champion" :profile="otherProfile" :games="[]" :scores="new Map()" />
            <RolesPanel v-model:role="role" :lanes="otherProfile.lanes" />
          </template>
          <MatchList v-model:queue="queue" v-model:champion="champion" v-model:role="role" v-model:order="order" puuid="mock-p2" :games="[]" :scores="new Map()" status="ready" private />
        </ProfileLayout>
      </div>
    </Variant>

    <Variant title="Loading">
      <div class="story"><ProfileLayout loading /></div>
    </Variant>
  </Story>
</template>
