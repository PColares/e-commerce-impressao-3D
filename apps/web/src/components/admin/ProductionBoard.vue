<script setup lang="ts">
import { computed, ref } from 'vue'
import { JOB_COLUMNS } from '@/lib/production'
import { useJobs, usePrinters, type PrintJob } from '@/composables/useProduction'
import JobCard from './JobCard.vue'
import JobFormDialog from './JobFormDialog.vue'
import StartJobDialog from './StartJobDialog.vue'
import FailJobDialog from './FailJobDialog.vue'

const { data: jobs, isPending } = useJobs()
const { data: printers } = usePrinters()

const byStatus = computed(() => {
  const groups = Object.fromEntries(JOB_COLUMNS.map((c) => [c.status, [] as PrintJob[]]))
  for (const job of jobs.value ?? []) groups[job.status]!.push(job)
  return groups
})

const summary = computed(() => {
  const all = jobs.value ?? []
  const free = (printers.value ?? []).filter((p) => p.status === 'AVAILABLE').length
  return {
    queued: all.filter((j) => j.status === 'QUEUED' || j.status === 'PREPARING').length,
    printing: all.filter((j) => j.status === 'PRINTING').length,
    late: all.filter((j) => j.late).length,
    free,
    total: printers.value?.length ?? 0,
  }
})

const selected = ref<PrintJob | null>(null)
const startOpen = ref(false)
const failOpen = ref(false)
const editOpen = ref(false)

function open(job: PrintJob, which: 'start' | 'fail' | 'edit') {
  selected.value = job
  if (which === 'start') startOpen.value = true
  if (which === 'fail') failOpen.value = true
  if (which === 'edit') editOpen.value = true
}
</script>

<template>
  <section>
    <p class="font-sans text-sm text-steel">
      {{ summary.queued }} na fila · {{ summary.printing }} imprimindo ·
      <span :class="summary.late ? 'font-medium text-red-700' : ''">
        {{ summary.late }} {{ summary.late === 1 ? 'atrasado' : 'atrasados' }}
      </span>
      ·
      {{ summary.free }} de {{ summary.total }} impressoras livres
    </p>

    <StartJobDialog v-model:open="startOpen" :job="selected" />
    <FailJobDialog v-model:open="failOpen" :job="selected" />
    <JobFormDialog v-model:open="editOpen" :job="selected" />

    <p v-if="isPending" class="mt-6 font-mono text-[11px] text-steel/70">Carregando…</p>
    <p v-else-if="!jobs?.length" class="mt-6 font-sans text-sm text-steel">
      Nenhum job ainda. Aprove um orçamento na aba Orçamentos e mande para a produção.
    </p>

    <!-- Celular/tablet: colunas lado a lado com rolagem horizontal. Telas largas:
         as 6 colunas cabem juntas. relative: sem ele, um filho absoluto escapa da
         rolagem e alarga a página no celular. -->
    <div v-else class="relative mt-5 flex gap-3 overflow-x-auto pb-2 xl:grid xl:grid-cols-6 xl:overflow-visible">
      <section
        v-for="column in JOB_COLUMNS"
        :key="column.status"
        :aria-label="column.label"
        class="flex w-[250px] shrink-0 flex-col gap-2 rounded-[14px] bg-cream p-2.5 ring-1 ring-black/5 xl:w-auto xl:min-w-0"
      >
        <h2 class="flex items-center justify-between px-1 font-mono text-[11px] uppercase tracking-[0.14em] text-steel/80">
          {{ column.label }}
          <span class="text-steel/50">{{ byStatus[column.status]!.length }}</span>
        </h2>
        <JobCard
          v-for="job in byStatus[column.status]"
          :key="job.id"
          :job="job"
          @start="open(job, 'start')"
          @fail="open(job, 'fail')"
          @edit="open(job, 'edit')"
        />
      </section>
    </div>
  </section>
</template>
