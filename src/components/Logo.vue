<script setup lang="ts">
import '../styles/base.css'

/** The Invade glyph, cropped to its bounds, optionally with the wordmark. */
withDefaults(defineProps<{ size?: number; word?: boolean }>(), { size: 28, word: false })
</script>

<template>
  <span class="iv-logo">
    <svg :height="size" :width="(size * 155) / 170" viewBox="54 22 155 170" aria-label="Invade" class="iv-logo-mark">
      <path
        d="M140.32,114.78l66.57-52.4-84.5,29.38,18.32-28.35-30.09,17.830,39.13-56.71-79.86,45.07-7.92,13.62.91,24.19,31.05,8.35,9.9,22.32,25.04,9.9-8.54,18.83-36.29.19v8.54l67.35,14.75-21.54-28.53,71.03-44.25-60.55-2.72ZM73.47,105.37l14.19-27.76,4.98,27.76h-19.17Z"
      />
      <polygon points="55.54 130.51 73.97 130.39 85.04 143.21 66.99 144.45 55.54 130.51" />
    </svg>
    <span v-if="word" class="iv-logo-word">Invade</span>
  </span>
</template>

<style>
.iv-logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.iv-logo-mark {
  display: block;
  flex: none;
  fill: var(--brand);
}
.iv-logo-word {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.005em;
  line-height: 1;
  color: var(--text-1);
}
</style>
