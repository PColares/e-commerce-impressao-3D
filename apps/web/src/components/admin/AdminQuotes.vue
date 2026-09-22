<script setup lang="ts">
import { ref } from 'vue'
import { ApiError } from '@/lib/api'
import { brl, layerHeightLabel } from '@/lib/format'
import { QUOTE_STATUS_LABEL, shortDate } from '@/lib/production'
import {
  downloadQuoteFile,
  useAdminQuotes,
  useApproveQuote,
  useRejectQuote,
  type AdminQuote,
} from '@/composables/useProduction'
import JobFormDialog from './JobFormDialog.vue'

const { data: quotes, isPending } = useAdminQuotes()
const approve = useApproveQuote()
const reject = useRejectQuote()
const error = ref<string | null>(null)

const jobDialogOpen = ref(false)
const selected = ref<AdminQuote | null>(null)

async function run(action: () => Promise<unknown>) {
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível concluir.'
  }
}

function sendToProduction(quote: AdminQuote) {
  selected.value = quote
  jobDialogOpen.value = true
}

const statusClass: Record<AdminQuote['status'], string> = {
  PENDING: 'bg-amber-soft/30 text-ink',
  APPROVED: 'bg-sage/15 text-sage',
  REJECTED: 'bg-ink/10 text-steel',
}
</script>

<template>
  <section>
    <p class="font-sans text-sm text-steel">
      Aprovar um orçamento cria o pedido do cliente. Depois é só mandar para a produção.
    </p>

    <JobFormDialog
      v-model:open="jobDialogOpen"
      :order-id="selected?.order?.id"
      :default-title="selected?.fileName"
    />

    <p v-if="error" class="mt-3 font-mono text-[11px] text-red-600">{{ error }}</p>
    <p v-if="isPending" class="mt-6 font-mono text-[11px] text-steel/70">Carregando…</p>
    <p v-else-if="!quotes?.length" class="mt-6 font-sans text-sm text-steel">Nenhum orçamento ainda.</p>

    <div v-else class="relative mt-5 overflow-x-auto rounded-[16px] ring-1 ring-line">
      <table class="w-full min-w-[820px] text-left font-sans text-sm">
        <thead class="bg-cream font-mono text-[11px] uppercase tracking-[0.12em] text-steel/70">
          <tr>
            <th class="px-4 py-3 font-normal">Data</th>
            <th class="px-4 py-3 font-normal">Cliente</th>
            <th class="px-4 py-3 font-normal">Arquivo e especificação</th>
            <th class="px-4 py-3 font-normal">Valor</th>
            <th class="px-4 py-3 font-normal">Status</th>
            <th class="px-4 py-3 font-normal"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="quote in quotes" :key="quote.id" class="border-t border-line align-top">
            <td class="px-4 py-3 whitespace-nowrap font-mono text-[12px] text-steel">{{ shortDate(quote.createdAt) }}</td>
            <td class="px-4 py-3">
              <div class="text-ink">{{ quote.user.name }}</div>
              <div class="font-mono text-[11px] text-steel/60">{{ quote.user.email }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-ink [overflow-wrap:anywhere]">{{ quote.fileName }}</div>
              <div class="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-steel">
                <span class="size-2.5 rounded-full ring-1 ring-black/10" :style="{ background: quote.color.hex }" />
                {{ quote.material.name }} · {{ quote.color.name }} · {{ layerHeightLabel(quote.layerHeight.millimeters) }}mm ·
                {{ quote.quantity }} un.
              </div>
              <button
                class="mt-1 font-sans text-xs text-copper hover:text-copper-deep"
                @click="run(() => downloadQuoteFile(quote.id, quote.fileName))"
              >
                Baixar arquivo
              </button>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">{{ brl(Number(quote.calculatedPrice)) }}</td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]', statusClass[quote.status]]">
                {{ QUOTE_STATUS_LABEL[quote.status] }}
              </span>
              <div v-if="quote.order?._count.printJobs" class="mt-1 font-mono text-[11px] text-copper">
                Em produção ({{ quote.order._count.printJobs }})
              </div>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <template v-if="quote.status === 'PENDING'">
                <button class="text-copper hover:text-copper-deep" @click="run(() => approve.mutateAsync(quote.id))">
                  Aprovar
                </button>
                <button class="ml-4 text-steel hover:text-ink" @click="run(() => reject.mutateAsync(quote.id))">
                  Recusar
                </button>
              </template>
              <button
                v-else-if="quote.order"
                class="text-copper hover:text-copper-deep"
                @click="sendToProduction(quote)"
              >
                Mandar para produção
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
