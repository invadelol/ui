<script setup lang="ts">
import MatchRowSkeleton from './MatchRowSkeleton.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * The profile page's frame: the header band on top, then the side panels beside the feed (the
 * feed is the page's subject). Narrow: the side panels go above the feed in two balanced columns.
 * Without side panels the content takes the whole width (another section of the profile).
 * Pass `loading` for the page's own loading shapes instead of the slots.
 */
defineProps<{ loading?: boolean }>()
</script>

<template>
  <div class="iv-pf">
    <template v-if="loading">
      <div class="iv-pf-head iv-pf-head-skel" aria-busy="true">
        <span class="iv-skel iv-pf-skel-icon" />
        <span class="iv-pf-skel-lines"><span class="iv-skel" style="width: 180px; height: 18px" /><span class="iv-skel" style="width: 120px; height: 11px" /></span>
        <span class="iv-pf-skel-ranks"><span class="iv-skel" /><span class="iv-skel" /></span>
      </div>
      <div class="iv-pf-cols">
        <aside class="iv-pf-side">
          <div class="iv-skel iv-pf-skel-panel" style="height: 228px" />
          <div class="iv-skel iv-pf-skel-panel" style="height: 300px" />
        </aside>
        <section class="iv-pf-feed">
          <div class="iv-skel iv-pf-skel-bar" />
          <span class="iv-skel iv-pf-skel-day" />
          <MatchRowSkeleton :count="7" />
        </section>
      </div>
    </template>
    <template v-else>
      <slot name="header" />
      <div class="iv-pf-cols" :class="{ solo: !$slots.side }">
        <aside v-if="$slots.side" class="iv-pf-side"><slot name="side" /></aside>
        <slot />
      </div>
    </template>
  </div>
</template>
