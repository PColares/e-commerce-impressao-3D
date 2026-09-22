<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from 'lucide-vue-next'

// Moldura comum dos modais do painel: título, botão de fechar, Esc e foco
// presos dentro. O conteúdo (em geral um formulário) vem pelo slot.
const open = defineModel<boolean>('open', { required: true })
withDefaults(defineProps<{ title: string; width?: string }>(), { width: 'max-w-[520px]' })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px]" />
      <DialogContent
        :class="[
          'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[16px] bg-cream p-6 shadow-2xl ring-1 ring-black/10 focus:outline-none',
          width,
        ]"
        :aria-describedby="undefined"
      >
        <div class="flex items-start justify-between gap-4">
          <DialogTitle class="font-sans text-lg font-semibold tracking-tight text-ink">{{ title }}</DialogTitle>
          <DialogClose
            class="grid size-8 place-items-center rounded-[8px] text-steel transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="Fechar"
          >
            <X class="size-4" />
          </DialogClose>
        </div>
        <div class="mt-5">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
