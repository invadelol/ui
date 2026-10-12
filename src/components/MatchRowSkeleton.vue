<script setup lang="ts">
import '../styles/base.css'
import '../styles/primitives.css'

/** Match rows while games load: the row's own shapes (portrait, two lines, items, score). */
withDefaults(defineProps<{ count?: number }>(), { count: 6 })
</script>

<template>
  <div class="iv-mr-skel-list" aria-busy="true">
    <div v-for="i in count" :key="i" class="iv-mr-skel" :style="{ opacity: 1 - (i - 1) * (0.6 / count) }">
      <span class="iv-skel iv-mr-skel-champ" />
      <span class="iv-mr-skel-lines"><span class="iv-skel" style="width: 76%" /><span class="iv-skel" style="width: 52%" /></span>
      <span class="iv-mr-skel-lines"><span class="iv-skel" style="width: 64%" /><span class="iv-skel" style="width: 80%" /></span>
      <span class="iv-mr-skel-lines iv-mr-skel-farm"><span class="iv-skel" style="width: 58%" /><span class="iv-skel" style="width: 46%" /></span>
      <span class="iv-skel iv-mr-skel-well" />
      <span class="iv-mr-skel-lines iv-mr-skel-score"><span class="iv-skel" /><span class="iv-skel" /></span>
    </div>
  </div>
</template>

<style>
.iv-mr-skel-list {
  display: grid;
  gap: 4px;
  container-type: inline-size;
}
.iv-mr-skel {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr) 168px 32px;
  align-items: center;
  gap: 16px;
  height: 64px;
  padding: 0 30px 0 17px;
  background: var(--surface-1);
  border-radius: var(--r-sm);
  box-shadow: var(--hi);
}
.iv-mr-skel-champ {
  width: 44px;
  height: 44px;
}
.iv-mr-skel-lines {
  display: grid;
  gap: 8px;
}
.iv-mr-skel-lines .iv-skel {
  height: 10px;
  border-radius: var(--r-xs);
}
.iv-mr-skel-well {
  height: 28px;
}
.iv-mr-skel-score {
  justify-items: end;
}
.iv-mr-skel-score .iv-skel {
  width: 22px;
}
.iv-mr-skel-score .iv-skel + .iv-skel {
  width: 16px;
}
@container (max-width: 640px) {
  .iv-mr-skel {
    grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr) 32px;
  }
  .iv-mr-skel-farm,
  .iv-mr-skel-well {
    display: none;
  }
}
/* A phone's rows are two lines (the loadout and items under the game): as tall, so nothing jumps. */
@container (max-width: 520px) {
  .iv-mr-skel {
    grid-template-columns: 40px minmax(0, 1fr) minmax(0, 1fr) 32px;
    gap: 10px;
    height: 92px;
    padding: 0 10px 0 14px;
  }
  .iv-mr-skel-champ {
    width: 40px;
    height: 40px;
  }
}
</style>
