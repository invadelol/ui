<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChampionTable, LpGraph, MatchDetailPanel, MatchList, PlayedWithPanel, PlayerHeader, ProfileLayout, RolesPanel } from '../src'
import { lpByGame, type MatchSummary, type Position, type QueueFilter } from '../src/logic'
import { detailOf, games, otherProfile, playedWith, profile, scores } from './fixtures'

const queue = shallowRef<QueueFilter>('all')
const champion = shallowRef(0)
const role = shallowRef<Position | ''>('')
const order = shallowRef<'recent' | 'champion'>('recent')
const lp = computed(() => lpByGame(profile.lp, games))

/**
 * Older pages: the fixtures again, a week further back each time, eight pages in all. The first
 * four are "stored" (they load as fast as the list scrolls); past them the "server" holds a page
 * back for 20 s every other page, as invade.lol does once its Riot budget is spent: the list just
 * ends there, and scrolling back to the end after the window loads the next one.
 */
const feed = shallowRef<MatchSummary[]>(games)
const more = shallowRef(true)
const heldOnce = new Set<number>()
async function loadMore(): Promise<void | { retryAfterMs: number }> {
  const page = feed.value.length / games.length
  const riot = page >= 4
  await new Promise((r) => setTimeout(r, riot ? 700 : 150))
  if (riot && page % 2 === 0 && !heldOnce.has(page)) {
    heldOnce.add(page)
    return { retryAfterMs: 20_000 }
  }
  feed.value = [...feed.value, ...games.map((g) => ({ ...g, gameId: g.gameId + page * 1000, creation: g.creation - page * 7 * 86_400_000 }))]
  more.value = page < 7
}
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
            :games="feed"
            :scores="scores"
            :lp="lp"
            status="ready"
            :more="more"
            :load-more="loadMore"
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
