<script setup lang="ts">
import { ref } from 'vue'
import { Wrench } from 'lucide-vue-next'
import { ApiError } from '@/lib/api'
import { PRINTER_STATUS_LABEL, duration, shortDate, type PrinterStatus } from '@/lib/production'
import {
  useDeletePrinter,
  usePrinters,
  useRegisterMaintenance,
  type Printer,
} from '@/composables/useProduction'
import Button from '@/components/ui/Button.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import PrinterFormDialog from './PrinterFormDialog.vue'

const { data: printers, isPending } = usePrinters()
const maintenance = useRegisterMaintenance()
const remove = useDeletePrinter()
const error = ref<string | null>(null)

const formOpen = ref(false)
const editing = ref<Printer | null>(null)
const confirmOpen = ref(false)
const toDelete = ref<Printer | null>(null)

function openForm(printer: Printer | null) {
  editing.value = printer
  formOpen.value = true
}

function askDelete(printer: Printer) {
  toDelete.value = printer
  confirmOpen.value = true
}

async function run(action: () => Promise<unknown>) {
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível concluir.'
  }
}

const hoursSinceMaintenance = (p: Printer) => Math.floor((p.printedMinutes - p.printedMinutesAtLastMaintenance) / 60)

const statusClass: Record<PrinterStatus, string> = {
  AVAILABLE: 'bg-sage/15 text-sage',
  PRINTING: 'bg-copper/15 text-copper-deep',
  MAINTENANCE: 'bg-amber-soft/40 text-ink',
  OFFLINE: 'bg-ink/10 text-steel',
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-4">
      <p class="font-sans text-sm text-steel">
        O status muda sozinho quando um job começa ou termina. Manutenção e offline você marca em Editar.
      </p>
      <Button class="shrink-0" @click="openForm(null)">Nova impressora</Button>
    </div>

    <PrinterFormDialog v-model:open="formOpen" :printer="editing" />
    <ConfirmDialog
      v-model:open="confirmOpen"
      title="Excluir impressora?"
      confirm-label="Excluir"
      @confirm="toDelete && run(() => remove.mutateAsync(toDelete!.id))"
    >
      <strong class="text-ink">{{ toDelete?.name }}</strong> sai da lista. Jobs e falhas antigos continuam no
      histórico, só sem a impressora.
    </ConfirmDialog>

    <p v-if="error" class="mt-3 font-mono text-[11px] text-red-600">{{ error }}</p>
    <p v-if="isPending" class="mt-6 font-mono text-[11px] text-steel/70">Carregando…</p>
    <p v-else-if="!printers?.length" class="mt-6 font-sans text-sm text-steel">
      Nenhuma impressora cadastrada. Comece pela sua K2.
    </p>

    <div v-else class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="printer in printers"
        :key="printer.id"
        class="flex flex-col rounded-[16px] bg-cream p-5 ring-1 ring-black/5"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-sans text-base font-semibold tracking-tight text-ink">{{ printer.name }}</h3>
            <div class="font-mono text-[11px] text-steel">{{ printer.model }}</div>
          </div>
          <span
            :class="[
              'shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
              statusClass[printer.status],
            ]"
          >
            {{ PRINTER_STATUS_LABEL[printer.status] }}
          </span>
        </div>

        <div v-if="printer.currentJob" class="mt-3 rounded-[10px] bg-paper p-3 font-sans text-sm ring-1 ring-line">
          <div class="font-mono text-[10px] uppercase tracking-[0.12em] text-steel/70">Imprimindo agora</div>
          <div class="mt-0.5 text-ink [overflow-wrap:anywhere]">{{ printer.currentJob.title }}</div>
          <div v-if="printer.currentJob.estimatedMinutes" class="font-mono text-[11px] text-steel">
            estimado {{ duration(printer.currentJob.estimatedMinutes) }}
          </div>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-sans text-xs">
          <dt class="text-steel/70">Horas impressas</dt>
          <dd class="text-right text-ink">{{ duration(printer.printedMinutes) }}</dd>
          <template v-if="printer.buildVolume">
            <dt class="text-steel/70">Volume</dt>
            <dd class="text-right text-ink">{{ printer.buildVolume }}</dd>
          </template>
          <dt class="text-steel/70">Bico</dt>
          <dd class="text-right text-ink">{{ Number(printer.nozzleDiameter).toFixed(2) }} mm</dd>
          <dt class="text-steel/70">Falhas registradas</dt>
          <dd class="text-right text-ink">{{ printer._count.failures }}</dd>
          <template v-if="printer.maintenanceIntervalHours">
            <dt class="text-steel/70">Desde a manutenção</dt>
            <dd class="text-right text-ink">
              {{ hoursSinceMaintenance(printer) }} de {{ printer.maintenanceIntervalHours }} h
            </dd>
          </template>
        </dl>

        <div v-if="printer.slots.length" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="slot in printer.slots"
            :key="slot.id"
            class="inline-flex items-center gap-1.5 rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] text-steel ring-1 ring-line"
          >
            <span class="text-steel/60">{{ slot.position }}</span>
            <span v-if="slot.color" class="size-2.5 rounded-full ring-1 ring-black/10" :style="{ background: slot.color.hex }" />
            {{ slot.material?.name ?? 'vazio' }}{{ slot.color ? ` ${slot.color.name}` : '' }}
          </span>
        </div>

        <div
          v-if="printer.maintenanceDue"
          class="mt-3 flex items-center gap-2 rounded-[10px] bg-amber-soft/30 px-3 py-2 font-sans text-xs text-ink"
        >
          <Wrench class="size-4 shrink-0" />
          Manutenção vencida
          <template v-if="printer.lastMaintenanceAt"> (última em {{ shortDate(printer.lastMaintenanceAt) }})</template>
        </div>

        <div class="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 font-sans text-sm">
          <button class="text-copper hover:text-copper-deep" @click="openForm(printer)">Editar</button>
          <button
            v-if="printer.maintenanceIntervalHours"
            class="text-steel hover:text-ink"
            @click="run(() => maintenance.mutateAsync(printer.id))"
          >
            Registrar manutenção
          </button>
          <button class="text-red-700 hover:text-red-800" @click="askDelete(printer)">Excluir</button>
        </div>
      </article>
    </div>
  </section>
</template>
