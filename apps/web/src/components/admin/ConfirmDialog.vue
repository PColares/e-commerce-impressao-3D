<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import Button from '@/components/ui/Button.vue'

// Confirmação de ação destrutiva. AlertDialog (e não Dialog) porque não fecha
// clicando fora: excluir só acontece com um clique explícito no botão.
const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px]" />
      <AlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-cream p-6 shadow-2xl ring-1 ring-black/10 focus:outline-none"
      >
        <AlertDialogTitle class="font-sans text-lg font-semibold tracking-tight text-ink">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="mt-2 font-sans text-sm text-steel">
          <slot />
        </AlertDialogDescription>
        <div class="mt-6 flex justify-end gap-3">
          <AlertDialogCancel as-child>
            <Button variant="secondary">Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction as-child @click="emit('confirm')">
            <Button variant="danger">{{ confirmLabel }}</Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
