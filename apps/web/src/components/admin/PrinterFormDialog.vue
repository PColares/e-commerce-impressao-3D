<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { ApiError } from '@/lib/api'
import { MANUAL_STATUS_LABEL, type PrinterManualStatus } from '@/lib/production'
import { useAdminReference, type AdminColor, type AdminMaterial } from '@/composables/useAdmin'
import { useSavePrinter, useSetSlots, type Printer } from '@/composables/useProduction'
import Button from '@/components/ui/Button.vue'
import AdminDialog from './AdminDialog.vue'
import { fieldClass, labelClass, optionalNumber, optionalText } from './form'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ printer: Printer | null }>()

const { data: materials } = useAdminReference<AdminMaterial>('materials')
const { data: colors } = useAdminReference<AdminColor>('colors')
const save = useSavePrinter()
const setSlots = useSetSlots()
const error = ref<string | null>(null)

const form = reactive({
  name: '',
  model: '',
  buildVolume: '',
  nozzleDiameter: '0.4' as string | number,
  maintenanceIntervalHours: '' as string | number,
  notes: '',
  manualStatus: 'ACTIVE' as PrinterManualStatus,
})
const slots = ref<{ position: number; materialId: string; colorId: string }[]>([])

watch(open, (isOpen) => {
  if (!isOpen) return
  error.value = null
  const p = props.printer
  Object.assign(form, {
    name: p?.name ?? '',
    model: p?.model ?? '',
    buildVolume: p?.buildVolume ?? '',
    nozzleDiameter: p ? Number(p.nozzleDiameter) : '0.4',
    maintenanceIntervalHours: p?.maintenanceIntervalHours ?? '',
    notes: p?.notes ?? '',
    manualStatus: p?.manualStatus ?? 'ACTIVE',
  })
  slots.value = (p?.slots ?? []).map((s) => ({
    position: s.position,
    materialId: s.material?.id ?? '',
    colorId: s.color?.id ?? '',
  }))
})

function addSlot() {
  const next = Math.max(0, ...slots.value.map((s) => s.position)) + 1
  slots.value.push({ position: next, materialId: '', colorId: '' })
}

async function onSubmit() {
  error.value = null
  const data = {
    name: form.name.trim(),
    model: form.model.trim(),
    buildVolume: optionalText(form.buildVolume),
    nozzleDiameter: optionalNumber(form.nozzleDiameter),
    maintenanceIntervalHours: optionalNumber(form.maintenanceIntervalHours),
    notes: optionalText(form.notes),
    ...(props.printer ? { manualStatus: form.manualStatus } : {}),
  }
  try {
    const saved = (await save.mutateAsync({ id: props.printer?.id, data })) as { id: string }
    await setSlots.mutateAsync({
      id: props.printer?.id ?? saved.id,
      slots: slots.value.map((s) => ({
        position: s.position,
        materialId: s.materialId || undefined,
        colorId: s.colorId || undefined,
      })),
    })
    open.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível salvar.'
  }
}
</script>

<template>
  <AdminDialog v-model:open="open" :title="printer ? 'Editar impressora' : 'Nova impressora'" width="max-w-[640px]">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="pr-name">Nome</label>
        <input id="pr-name" v-model="form.name" :class="fieldClass" required maxlength="60" placeholder="K2 #1" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="pr-model">Modelo</label>
        <input id="pr-model" v-model="form.model" :class="fieldClass" required maxlength="80" placeholder="Creality K2 Plus" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="pr-volume">Volume de impressão</label>
        <input id="pr-volume" v-model="form.buildVolume" :class="fieldClass" placeholder="350 × 350 × 350 mm" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="pr-nozzle">Bico (mm)</label>
        <input id="pr-nozzle" v-model="form.nozzleDiameter" type="number" step="0.05" min="0.1" max="2" :class="fieldClass" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="pr-maint">Manutenção a cada (h)</label>
        <input
          id="pr-maint"
          v-model="form.maintenanceIntervalHours"
          type="number"
          min="1"
          :class="fieldClass"
          placeholder="ex: 200"
        />
      </div>
      <div v-if="printer" class="flex flex-col gap-1.5">
        <label :class="labelClass" for="pr-status">Status</label>
        <select id="pr-status" v-model="form.manualStatus" :class="fieldClass">
          <option v-for="(label, value) in MANUAL_STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1.5 sm:col-span-2">
        <label :class="labelClass" for="pr-notes">Observações</label>
        <textarea id="pr-notes" v-model="form.notes" rows="2" :class="fieldClass" />
      </div>

      <fieldset class="sm:col-span-2">
        <legend :class="labelClass">Filamentos carregados</legend>
        <p class="mt-1 font-sans text-xs text-steel">
          Uma linha por posição (na K2, os slots do CFS). Ajuda a escolher a impressora certa ao iniciar um job.
        </p>
        <div class="mt-2 flex flex-col gap-2">
          <div v-for="(slot, index) in slots" :key="index" class="flex items-center gap-2">
            <span class="w-6 shrink-0 text-center font-mono text-xs text-steel">{{ slot.position }}</span>
            <select v-model="slot.materialId" :aria-label="`Material da posição ${slot.position}`" :class="fieldClass">
              <option value="">— vazio —</option>
              <option v-for="m in materials" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <select v-model="slot.colorId" :aria-label="`Cor da posição ${slot.position}`" :class="fieldClass">
              <option value="">— sem cor —</option>
              <option v-for="c in colors" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <button
              type="button"
              class="grid size-9 shrink-0 place-items-center rounded-[8px] text-steel hover:bg-ink/5 hover:text-red-700"
              :aria-label="`Remover posição ${slot.position}`"
              @click="slots.splice(index, 1)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
          <button
            type="button"
            class="inline-flex w-fit items-center gap-1.5 font-sans text-sm text-copper hover:text-copper-deep"
            @click="addSlot"
          >
            <Plus class="size-4" /> Adicionar posição
          </button>
        </div>
      </fieldset>

      <p v-if="error" class="font-mono text-[11px] text-red-600 sm:col-span-2">{{ error }}</p>

      <div class="flex justify-end gap-3 sm:col-span-2">
        <Button variant="secondary" @click="open = false">Cancelar</Button>
        <Button type="submit" :disabled="save.isPending.value || setSlots.isPending.value">Salvar impressora</Button>
      </div>
    </form>
  </AdminDialog>
</template>
