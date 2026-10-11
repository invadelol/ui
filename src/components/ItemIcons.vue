<script setup lang="ts">
import { useNames } from '../context'

/** Item images in a row; an empty slot (id 0) is skipped. Sized by the parent's CSS. */
defineProps<{ ids: number[] }>()
const { itemIcon } = useNames()
</script>

<template>
  <template v-for="(id, i) in ids" :key="i"><img v-if="id" :src="itemIcon(id)" alt="" /></template>
</template>
