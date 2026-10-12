<script setup lang="ts" generic="Id extends string | number">
import '../styles/base.css'
import '../styles/primitives.css'

/** A segmented control (filters, sorts, chart metrics); `sm` for panel and chart heads. */
withDefaults(defineProps<{ options: readonly { id: Id; label: string }[]; size?: 'md' | 'sm' }>(), { size: 'md' })
const model = defineModel<Id>({ required: true })
</script>

<template>
  <div class="iv-seg" :class="{ sm: size === 'sm' }" role="group">
    <button v-for="o in options" :key="o.id" type="button" :class="{ on: model === o.id }" :aria-pressed="model === o.id" @click="model = o.id">{{ o.label }}</button>
  </div>
</template>
