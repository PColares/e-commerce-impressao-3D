<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ApiError } from '@/lib/api'
import { FAILURE_LABEL, type FailureReason } from '@/lib/production'
import { useFailJob, type PrintJob } from '@/composables/useProduction'
import Button from '@/components/ui/Button.vue'
import AdminDialog from './AdminDialog.vue'
import { fieldClass, labelClass, optionalNumber, optionalText } from './form'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ job: PrintJob | null }>()

const fail = useFailJob()
const error = ref<string | null>(null)
const form = reactive({ reason: 'SPAGHETTI' as FailureReason, wastedGrams: '' as string | number, notes: '' })

watch(open, (isOpen) => {
  if (!isOpen) return
  error.value = null
  Object.assign(form, { reason: 'SPAGHETTI', wastedGrams: '', notes: '' })
})

async function onSubmit() {
  if (!props.job) return
  error.value = null
  try {
    await fail.mutateAsync({
      id: props.job.id,
      data: { reason: form.reason, wastedGrams: optionalNumber(form.wastedGrams), notes: optionalText(form.notes) },
    })
    open.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível registrar.'
  }
}
</script>

<template>
  <AdminDialog v-model:open="open" title="Registrar falha">
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <p class="font-sans text-sm text-steel">
        <strong class="text-ink">{{ job?.title }}</strong> volta para a fila para ser reimpresso e a impressora fica
        livre.
      </p>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="fail-reason">Motivo</label>
        <select id="fail-reason" v-model="form.reason" :class="fieldClass">
          <option v-for="(label, value) in FAILURE_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="fail-grams">Filamento perdido (g)</label>
        <input id="fail-grams" v-model="form.wastedGrams" type="number" min="0" :class="fieldClass" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="fail-notes">Observações</label>
        <textarea id="fail-notes" v-model="form.notes" rows="2" :class="fieldClass" placeholder="o que aconteceu, o que ajustar" />
      </div>

      <p v-if="error" class="font-mono text-[11px] text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3">
        <Button variant="secondary" @click="open = false">Cancelar</Button>
        <Button type="submit" variant="danger" :disabled="fail.isPending.value">Registrar falha</Button>
      </div>
    </form>
  </AdminDialog>
</template>
