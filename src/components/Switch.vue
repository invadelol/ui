<script setup lang="ts">
import '../styles/base.css'
import '../styles/primitives.css'

/** A toggle switch; `label` names it for assistive technology. */
defineProps<{ label?: string }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="iv-switch" :title="label"><input v-model="model" type="checkbox" :aria-label="label" /><i /></label>
</template>
