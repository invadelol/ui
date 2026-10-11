<script setup lang="ts">
import { computed } from 'vue'
import { useInvadeUi, type LinkTarget } from '../context'

/**
 * A link to a player, a game or a champion. With an `href` from the host it is a real link (the
 * website: crawlable, opens in a new tab); `onOpen` takes the click (in-app navigation, a router
 * visit). With neither, or without a target, it is inert.
 */
const props = defineProps<{ to: LinkTarget | null }>()
const ui = useInvadeUi()
const href = computed(() => (props.to ? ui.linkTo(props.to) : undefined))
const live = computed(() => !!props.to && (!!href.value || !!ui.onOpen))

function open(e: MouseEvent) {
  if (!props.to || !ui.onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  ui.onOpen(props.to, e)
}
</script>

<template>
  <a v-if="href" :href="href" @click="open"><slot /></a>
  <button v-else type="button" :disabled="!live" @click="open"><slot /></button>
</template>
