<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError } from '@/lib/api'
import { usePrinters, useStartJob, type PrintJob, type Printer } from '@/composables/useProduction'
import Button from '@/components/ui/Button.vue'
import AdminDialog from './AdminDialog.vue'
import { fieldClass, labelClass } from './form'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ job: PrintJob | null }>()

const { data: printers } = usePrinters()
const start = useStartJob()
const printerId = ref('')
const error = ref<string | null>(null)

// Só as livres: ocupada, em manutenção ou offline nem aparece como opção.
const available = computed(() => (printers.value ?? []).filter((p) => p.status === 'AVAILABLE'))

// Destaca as que já têm o material e a cor do pedido carregados (CFS da K2).
function hasFilament(printer: Printer) {
  const quote = props.job?.order.quote
  if (!quote) return false
  return printer.slots.some((slot) => slot.material?.name === quote.material.name && slot.color?.name === quote.color.name)
}
const loaded = computed(() => available.value.filter(hasFilament))

watch(open, (isOpen) => {
  if (!isOpen) return
  error.value = null
  printerId.value = loaded.value[0]?.id ?? available.value[0]?.id ?? ''
})

async function onSubmit() {
  if (!props.job || !printerId.value) return
  error.value = null
  try {
    await start.mutateAsync({ id: props.job.id, printerId: printerId.value })
    open.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível iniciar.'
  }
}
</script>

<template>
  <AdminDialog v-model:open="open" title="Iniciar impressão">
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <p class="font-sans text-sm text-steel">
        <strong class="text-ink">{{ job?.title }}</strong>
        <template v-if="job?.order.quote">
          · {{ job.order.quote.material.name }} {{ job.order.quote.color.name }}
        </template>
      </p>

      <p v-if="!available.length" class="font-sans text-sm text-steel">
        Nenhuma impressora disponível agora. Termine uma impressão ou cadastre uma impressora na aba Impressoras.
      </p>
      <template v-else>
        <div class="flex flex-col gap-1.5">
          <label :class="labelClass" for="start-printer">Impressora</label>
          <select id="start-printer" v-model="printerId" :class="fieldClass" required>
            <option v-for="printer in available" :key="printer.id" :value="printer.id">{{ printer.name }}</option>
          </select>
        </div>
        <p v-if="loaded.length" class="font-mono text-[11px] text-sage">
          Já com esse filamento carregado: {{ loaded.map((p) => p.name).join(', ') }}
        </p>
      </template>

      <p v-if="error" class="font-mono text-[11px] text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3">
        <Button variant="secondary" @click="open = false">Cancelar</Button>
        <Button type="submit" :disabled="!available.length || start.isPending.value">Iniciar</Button>
      </div>
    </form>
  </AdminDialog>
</template>
