<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useStatGroups } from '../fit'
import { hideTip, showTip, tipOn } from '../tip'
import StatIcon, { type StatIconName } from './StatIcon.vue'
import '../styles/base.css'
import '../styles/primitives.css'

/**
 * A stat's name after its Riot icon. When the name no longer fits its cell (a narrow window, a
 * long translation) it hides, still read by screen readers, and the icon stays alone with the
 * name in a tooltip: on hover with a mouse, on a tap on touch. Labels of one `group` (see
 * `provideStatGroups`) hide together. `bare` always shows the icon alone.
 */
const props = withDefaults(defineProps<{ stat: StatIconName; label: string; size?: number; group?: string; bare?: boolean }>(), {
  size: 14,
  group: undefined,
})

/** The gap between the icon and the name, in px (`.iv-stat`). */
const GAP = 4

const root = useTemplateRef<HTMLElement>('root')
const text = useTemplateRef<HTMLElement>('text')
const groups = useStatGroups()
const id = Symbol()

/** This label's name does not fit its cell. */
const tight = shallowRef(false)
const hidden = computed(() => {
  if (props.bare) return true
  if (props.group && groups) return (groups.get(props.group)?.size ?? 0) > 0
  return tight.value
})

function join(group: string | undefined, on: boolean) {
  if (!group || !groups) return
  if (!groups.has(group)) groups.set(group, new Set())
  const set = groups.get(group)!
  if (on) set.add(id)
  else set.delete(id)
}
watch(tight, (on) => join(props.group, on))
watch(
  () => props.group,
  (now, before) => {
    join(before, false)
    join(now, tight.value)
  },
)

/** The cell's room against the icon and the whole name; a cell that is not shown has no say. */
function measure() {
  const box = root.value?.parentElement
  if (!box || !text.value) return
  if (!box.clientWidth) return void (tight.value = false)
  const css = getComputedStyle(box)
  const room = box.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight)
  tight.value = text.value.scrollWidth + props.size + GAP > room + 0.5
}

let observer: ResizeObserver | undefined
onMounted(() => {
  if (props.bare || !root.value?.parentElement) return
  observer = new ResizeObserver(measure)
  observer.observe(root.value.parentElement)
  document.fonts?.ready.then(measure)
})
watch(() => [props.label, props.size], measure, { flush: 'post' })
onBeforeUnmount(() => {
  observer?.disconnect()
  join(props.group, false)
  if (root.value) hideTip(root.value)
})

/** How the last press came: a mouse hovers, a finger taps. */
let pointer = 'mouse'
let wait = 0
function enter(e: PointerEvent) {
  pointer = e.pointerType
  if (pointer !== 'mouse' || !hidden.value) return
  wait = window.setTimeout(() => root.value && showTip(root.value, props.label), 300)
}
function leave() {
  clearTimeout(wait)
  if (pointer === 'mouse' && root.value) hideTip(root.value)
}
/** A tap on a lone icon names it, and does not open the row it sits in. */
function tap(e: MouseEvent) {
  if (pointer === 'mouse' || !hidden.value || !root.value) return
  e.stopPropagation()
  if (tipOn(root.value)) hideTip(root.value)
  else showTip(root.value, props.label, 2500)
}
</script>

<template>
  <span
    ref="root"
    class="iv-stat"
    :class="{ bare: hidden }"
    @pointerdown="pointer = $event.pointerType"
    @pointerenter="enter"
    @pointerleave="leave"
    @click="tap"
  >
    <StatIcon :name="stat" :size="size" />
    <span ref="text" class="iv-stat-l">{{ label }}</span>
  </span>
</template>
