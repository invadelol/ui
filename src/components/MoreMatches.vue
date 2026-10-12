<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useInvadeUi } from '../context'
import { endOfList } from '../logic/pager'
import Icon from './Icon.vue'
import MatchRowSkeleton from './MatchRowSkeleton.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'

/**
 * The end of a match list: older games load as it comes into view, one page after another while
 * it stays in view, with no pacing of its own (stored games are free; the server limits what it
 * must ask Riot for). `load` appends the next page in the host; it resolves `{ retryAfterMs }`
 * when the source held older games back (invade.lol's Riot budget): the list then ends quietly,
 * with no countdown, and a later reach of the end after that window asks once more. It throws on
 * failure (Try again). `more`: older games may exist. Key it by player.
 */
const props = defineProps<{ more: boolean; load: () => Promise<void | { retryAfterMs: number }> }>()
const { t } = useInvadeUi()

const end = endOfList()
const state = shallowRef<'idle' | 'loading' | 'error'>('idle')
const el = shallowRef<HTMLElement | null>(null)
let visible = false
let observer: IntersectionObserver | undefined

/** `reach`: the end just came into view (or the user asked again), which may lift a quiet hold. */
async function next(reach = false) {
  if (!props.more || state.value === 'loading' || !visible) return
  if (end.held() && !(reach && end.ask())) return
  const top = el.value?.offsetTop
  state.value = 'loading'
  try {
    const r = await props.load()
    state.value = 'idle'
    if (r && typeof r.retryAfterMs === 'number') {
      end.hold(r.retryAfterMs)
      return
    }
    end.clear()
  } catch {
    state.value = 'error'
    return
  }
  // New rows pushed the end down: observing again reports whether it is still in view (then the
  // next page loads). When nothing moved, the next page waits for the next time it comes into view.
  await nextTick()
  if (el.value && observer && el.value.offsetTop !== top) {
    observer.unobserve(el.value)
    observer.observe(el.value)
  }
}

function retry() {
  state.value = 'idle'
  visible = true
  void next(true)
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      const was = visible
      visible = entry.isIntersecting
      if (visible) void next(!was)
    },
    { rootMargin: '240px 0px' },
  )
  if (el.value) observer.observe(el.value)
})
watch(
  () => props.more,
  (more) => {
    // A new list (filters, a refresh): it asks freely again.
    if (more) end.clear()
    void next()
  },
)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="el" class="iv-more" :aria-busy="state === 'loading'">
    <MatchRowSkeleton v-if="state === 'loading'" :count="3" />
    <p v-else-if="state === 'error'" class="iv-error" role="alert">
      <Icon name="x" :size="15" />{{ t('Older games could not be loaded.') }}
      <button type="button" class="iv-btn sm" @click="retry"><Icon name="refresh" :size="13" />{{ t('Try again') }}</button>
    </p>
    <p v-else-if="!more" class="iv-more-line iv-more-end" role="status">{{ t("That's every tracked game") }}</p>
  </div>
</template>
