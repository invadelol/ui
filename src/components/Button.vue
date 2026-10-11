<script setup lang="ts">
/** A button: `primary` is the one violet action of a view; `ghost` sits in toolbars; `danger` deletes. */
withDefaults(defineProps<{ variant?: 'default' | 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; iconOnly?: boolean; type?: 'button' | 'submit' }>(), {
  variant: 'default',
  size: 'md',
  iconOnly: false,
  type: 'button',
})
</script>

<template>
  <button :type="type" class="iv-btn" :class="[variant !== 'default' && variant, size !== 'md' && size, { 'icon-only': iconOnly }]"><slot /></button>
</template>
