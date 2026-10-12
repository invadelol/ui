<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useInvadeUi } from '../context'
import { mmss } from '../logic/format'
import { pager } from '../logic/pager'
import Icon from './Icon.vue'
import MatchRowSkeleton from './MatchRowSkeleton.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * The end of a match list: older games load as it comes into view, under the paging rule of
 * `logic/pager` (a few pages right away, then one every two minutes, counted per mounted list: key
 * it by player). While the rule holds a page back it says when the next one comes, and loads it
 * by itself if the end is still in view. `load` resolves `{ wait }` (ms) when the source refused
 * (a server's own count); it throws on failure (Try again). `more`: older games may exist.
 */
const props = defineProps<{ more: boolean; load: () => Promise<void | { wait: number }> }>()
const { t } = useInvadeUi()

const pages = pager()
const state = shallowRef<'idle' | 'loading' | 'error'>('idle')
/** Seconds before the next page, while the rule holds it back. */
const left = shallowRef(0)
const el = shallowRef<HTMLElement | null>(null)
let visible = false
let timer: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined

async function next(retry = false) {
  clearTimeout(timer)
  if (!props.more || state.value === 'loading' || !(visible || retry)) return
  const wait = pages.wait()
  left.value = Math.ceil(wait / 1000)
  // Counts down only while in view; once out of view, coming back reads the clock again.
  if (wait > 0) {
    if (visible) timer = setTimeout(next, wait % 1000 || 1000)
    return
  }
  state.value = 'loading'
  try {
    const r = await props.load()
    if (r?.wait) pages.hold(r.wait)
    else pages.take()
    state.value = 'idle'
  } catch {
    state.value = 'error'
    return
  }
  // New rows pushed the end down, or hid behind filters: observing again reports where it is now.
  await nextTick()
  if (el.value && observer) {
    observer.unobserve(el.value)
    observer.observe(el.value)
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible) void next()
      else clearTimeout(timer)
    },
    { rootMargin: '240px 0px' },
  )
  if (el.value) observer.observe(el.value)
})
watch(
  () => props.more,
  () => void next(),
)
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(timer)
})
</script>

<template>
  <div ref="el" class="iv-more" :aria-busy="state === 'loading'">
    <MatchRowSkeleton v-if="state === 'loading'" :count="3" />
    <p v-else-if="state === 'error'" class="iv-error" role="alert">
      <Icon name="x" :size="15" />{{ t('Older games could not be loaded.') }}
      <button type="button" class="iv-btn sm" @click="next(true)"><Icon name="refresh" :size="13" />{{ t('Try again') }}</button>
    </p>
    <p v-else-if="more && left > 0" class="iv-more-line">{{ t('More games in {time}', { time: mmss(left) }) }}</p>
    <p v-else-if="!more" class="iv-more-line iv-more-end" role="status">{{ t("That's every tracked game") }}</p>
  </div>
</template>
