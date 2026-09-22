<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError } from '@/lib/api'
import { FAILURE_LABEL, duration, shortDate, type JobStatus } from '@/lib/production'
import { downloadQuoteFile, useFinishPrint, useMoveJob, type PrintJob } from '@/composables/useProduction'
import { ORDER_STATUS_LABEL } from '@/lib/orders'

const props = defineProps<{ job: PrintJob }>()
const emit = defineEmits<{ start: []; fail: []; edit: [] }>()

const move = useMoveJob()
const finish = useFinishPrint()
const error = ref<string | null>(null)

async function run(action: () => Promise<unknown>) {
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível concluir.'
  }
}
const moveTo = (status: JobStatus) => run(() => move.mutateAsync({ id: props.job.id, status }))

// Previsão de término: início + tempo estimado do fatiador, no fuso de Belém.
const eta = computed(() => {
  const { startedAt, estimatedMinutes } = props.job
  if (!startedAt || !estimatedMinutes) return null
  const end = new Date(new Date(startedAt).getTime() + estimatedMinutes * 60_000)
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Belem' }).format(end)
})

const failureCount = computed(() => props.job.failures.length)

const action = 'rounded-[7px] px-2.5 py-1 text-xs font-medium transition-colors'
const primary = `${action} bg-ink text-paper hover:bg-steel`
const secondary = `${action} text-steel ring-1 ring-ink/15 hover:bg-ink/5`
const danger = `${action} text-red-700 ring-1 ring-red-700/30 hover:bg-red-50`
</script>

<template>
  <article
    :class="[
      'rounded-[12px] bg-paper p-3 ring-1',
      job.late ? 'ring-red-600/50' : 'ring-line',
    ]"
  >
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-sans text-sm font-semibold [overflow-wrap:anywhere] leading-snug text-ink">{{ job.title }}</h3>
      <button class="shrink-0 font-sans text-xs text-copper hover:text-copper-deep" @click="emit('edit')">Editar</button>
    </div>

    <div class="mt-1 font-sans text-xs text-steel">{{ job.order.user.name }}</div>
    <div v-if="job.order.quote" class="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-steel">
      <span class="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" :style="{ background: job.order.quote.color.hex }" />
      {{ job.order.quote.material.name }} {{ job.order.quote.color.name }} · {{ job.order.quote.quantity }} un.
    </div>
    <button
      v-if="job.order.quoteId && job.order.quote"
      class="mt-1 font-sans text-xs text-copper hover:text-copper-deep"
      @click="run(() => downloadQuoteFile(job.order.quoteId!, job.order.quote!.fileName))"
    >
      Baixar arquivo
    </button>

    <div class="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]">
      <span v-if="job.late" class="rounded-full bg-red-600 px-2 py-0.5 text-paper">Atrasado</span>
      <span
        :class="[
          'rounded-full px-2 py-0.5',
          job.order.status === 'AWAITING_PAYMENT' ? 'bg-ink/5 text-steel' : 'bg-sage/15 text-sage',
        ]"
      >
        {{ ORDER_STATUS_LABEL[job.order.status]?.label ?? job.order.status }}
      </span>
      <span v-if="job.priority === 'HIGH'" class="rounded-full bg-copper/15 px-2 py-0.5 text-copper-deep">Alta prioridade</span>
      <span v-if="job.dueDate" class="rounded-full bg-ink/5 px-2 py-0.5 text-steel">Prazo {{ shortDate(job.dueDate) }}</span>
      <span v-if="failureCount" class="rounded-full bg-amber-soft/30 px-2 py-0.5 text-ink">
        {{ failureCount }} {{ failureCount === 1 ? 'falha' : 'falhas' }}
      </span>
    </div>

    <div
      v-if="job.estimatedMinutes || job.estimatedGrams || job.printer"
      class="mt-2 font-mono text-[11px] text-steel"
    >
      <span v-if="job.printer" class="whitespace-nowrap text-ink">{{ job.printer.name }}</span>
      <span v-if="job.printer && (job.estimatedMinutes || job.estimatedGrams)"> · </span>
      <span v-if="job.estimatedMinutes" class="whitespace-nowrap">{{ duration(job.estimatedMinutes) }}</span>
      <span v-if="job.estimatedMinutes && job.estimatedGrams"> · </span>
      <span v-if="job.estimatedGrams" class="whitespace-nowrap">{{ job.estimatedGrams }} g</span>
      <div v-if="job.status === 'PRINTING' && eta">termina ~{{ eta }}</div>
    </div>

    <details v-if="failureCount" class="mt-2 font-sans text-xs text-steel">
      <summary class="cursor-pointer select-none text-steel/80">Ver falhas</summary>
      <ul class="mt-1 space-y-1">
        <li v-for="failure in job.failures" :key="failure.id">
          {{ shortDate(failure.createdAt) }} · {{ FAILURE_LABEL[failure.reason] }}
          <template v-if="failure.printer"> · {{ failure.printer.name }}</template>
          <template v-if="failure.wastedGrams"> · {{ failure.wastedGrams }} g</template>
          <div v-if="failure.notes" class="text-steel/70">{{ failure.notes }}</div>
        </li>
      </ul>
    </details>

    <p v-if="error" class="mt-2 font-mono text-[11px] text-red-600">{{ error }}</p>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <template v-if="job.status === 'QUEUED'">
        <button :class="primary" @click="emit('start')">Iniciar</button>
        <button :class="secondary" @click="moveTo('PREPARING')">Preparar</button>
      </template>
      <template v-else-if="job.status === 'PREPARING'">
        <button :class="primary" @click="emit('start')">Iniciar</button>
        <button :class="secondary" @click="moveTo('QUEUED')">Voltar para a fila</button>
      </template>
      <template v-else-if="job.status === 'PRINTING'">
        <button :class="primary" @click="run(() => finish.mutateAsync(job.id))">Terminar impressão</button>
        <button :class="danger" @click="emit('fail')">Falhou</button>
      </template>
      <template v-else-if="job.status === 'FINISHING'">
        <button :class="primary" @click="moveTo('INSPECTION')">Conferência</button>
        <button :class="danger" @click="emit('fail')">Falhou</button>
      </template>
      <template v-else-if="job.status === 'INSPECTION'">
        <button :class="primary" @click="moveTo('READY')">Pronto</button>
        <button :class="secondary" @click="moveTo('FINISHING')">Voltar para acabamento</button>
        <button :class="danger" @click="emit('fail')">Falhou</button>
      </template>
      <template v-else>
        <button :class="secondary" @click="moveTo('INSPECTION')">Voltar para conferência</button>
      </template>
    </div>
  </article>
</template>
