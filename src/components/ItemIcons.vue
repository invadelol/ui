<script setup lang="ts">
import { useNames } from '../context'

/** Item images in a row, named on hover; an empty slot (id 0) is skipped. Sized by the parent's CSS. */
defineProps<{ ids: number[] }>()
const { itemIcon, itemName } = useNames()
</script>

<template>
  <template v-for="(id, i) in ids" :key="i"><img v-if="id" :src="itemIcon(id)" :alt="itemName(id)" :title="itemName(id)" /></template>
</template>
