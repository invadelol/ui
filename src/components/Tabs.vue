<script setup lang="ts" generic="Id extends string">
import '../styles/base.css'
import '../styles/primitives.css'

/** Tabs: switching views inside a page, a straight violet underline on the active one. */
defineProps<{ tabs: readonly { id: Id; label: string }[] }>()
const model = defineModel<Id>({ required: true })
</script>

<template>
  <nav class="iv-tabs">
    <button v-for="x in tabs" :key="x.id" type="button" :class="{ on: model === x.id }" :aria-pressed="model === x.id" @click="model = x.id">{{ x.label }}</button>
  </nav>
</template>
