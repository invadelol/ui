<script setup lang="ts">
import '../styles/base.css'
import '../styles/primitives.css'

/** A panel: one topic, with an optional head (title, `meta` text, then the `head` slot on the right). */
defineProps<{ title?: string; meta?: string }>()
</script>

<template>
  <section class="iv-panel">
    <header v-if="title || meta || $slots.head" class="iv-panel-head">
      <h3 v-if="title">{{ title }}</h3>
      <span v-if="meta" class="meta">{{ meta }}</span>
      <slot name="head" />
    </header>
    <slot />
  </section>
</template>
