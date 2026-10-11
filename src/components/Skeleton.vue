<script setup lang="ts">
/** A loading shape: a block with a slow shimmer (still when motion is reduced). */
defineProps<{ width?: string; height?: string }>()
</script>

<template>
  <span class="iv-skel" :style="{ display: 'block', width, height }" aria-hidden="true" />
</template>
