<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ApiError } from '@/lib/api'
import { PRIORITY_LABEL, dateInputValue, dueDateFromInput, type JobPriority } from '@/lib/production'
import { useCreateJob, useUpdateJob, type PrintJob } from '@/composables/useProduction'
import Button from '@/components/ui/Button.vue'
import AdminDialog from './AdminDialog.vue'
import { fieldClass, labelClass, optionalNumber, optionalText } from './form'

// Cria um job a partir de um pedido (orderId) ou edita um job existente.
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ orderId?: string; defaultTitle?: string; job?: PrintJob | null }>()

const create = useCreateJob()
const update = useUpdateJob()
const error = ref<string | null>(null)

const form = reactive({
  title: '',
  priority: 'NORMAL' as JobPriority,
  dueDate: '',
  estimatedMinutes: '' as string | number,
  estimatedGrams: '' as string | number,
  notes: '',
})

watch(open, (isOpen) => {
  if (!isOpen) return
  error.value = null
  const job = props.job
  Object.assign(form, {
    title: job?.title ?? props.defaultTitle ?? '',
    priority: job?.priority ?? 'NORMAL',
    dueDate: dateInputValue(job?.dueDate ?? null),
    estimatedMinutes: job?.estimatedMinutes ?? '',
    estimatedGrams: job?.estimatedGrams ?? '',
    notes: job?.notes ?? '',
  })
})

async function onSubmit() {
  error.value = null
  const data = {
    title: form.title.trim(),
    priority: form.priority,
    dueDate: dueDateFromInput(form.dueDate),
    estimatedMinutes: optionalNumber(form.estimatedMinutes),
    estimatedGrams: optionalNumber(form.estimatedGrams),
    notes: optionalText(form.notes),
  }
  try {
    if (props.job) {
      await update.mutateAsync({ id: props.job.id, data })
    } else {
      await create.mutateAsync({ orderId: props.orderId!, ...data, dueDate: data.dueDate ?? undefined })
    }
    open.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível salvar.'
  }
}
</script>

<template>
  <AdminDialog v-model:open="open" :title="job ? 'Editar job' : 'Mandar para produção'">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="flex flex-col gap-1.5 sm:col-span-2">
        <label :class="labelClass" for="job-title">Título</label>
        <input id="job-title" v-model="form.title" :class="fieldClass" required maxlength="120" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="job-priority">Prioridade</label>
        <select id="job-priority" v-model="form.priority" :class="fieldClass">
          <option v-for="(label, value) in PRIORITY_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="job-due">Prazo</label>
        <input id="job-due" v-model="form.dueDate" type="date" :class="fieldClass" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="job-minutes">Tempo estimado (min)</label>
        <input id="job-minutes" v-model="form.estimatedMinutes" type="number" min="1" :class="fieldClass" placeholder="do fatiador" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="job-grams">Filamento estimado (g)</label>
        <input id="job-grams" v-model="form.estimatedGrams" type="number" min="1" :class="fieldClass" placeholder="do fatiador" />
      </div>
      <div class="flex flex-col gap-1.5 sm:col-span-2">
        <label :class="labelClass" for="job-notes">Observações</label>
        <textarea id="job-notes" v-model="form.notes" rows="2" :class="fieldClass" />
      </div>

      <p v-if="error" class="font-mono text-[11px] text-red-600 sm:col-span-2">{{ error }}</p>

      <div class="flex justify-end gap-3 sm:col-span-2">
        <Button variant="secondary" @click="open = false">Cancelar</Button>
        <Button type="submit" :disabled="create.isPending.value || update.isPending.value">
          {{ job ? 'Salvar job' : 'Criar job' }}
        </Button>
      </div>
    </form>
  </AdminDialog>
</template>
