<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'dark' | 'danger'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false },
)

const variants = {
  primary: 'bg-copper text-paper ring-1 ring-copper-deep/40 hover:bg-copper-deep',
  secondary: 'bg-transparent text-ink ring-1 ring-ink/15 hover:bg-ink/5',
  dark: 'bg-ink text-paper hover:bg-steel',
  danger: 'bg-red-700 text-paper ring-1 ring-red-900/30 hover:bg-red-800',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="
      cn(
        'inline-flex items-center justify-center rounded-[9px] px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
      )
    "
  >
    <slot />
  </button>
</template>
