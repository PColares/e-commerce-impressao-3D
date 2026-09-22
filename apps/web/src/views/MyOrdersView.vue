<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { pixPrice } from '@crealio/shared'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { ApiError } from '@/lib/api'
import { brl, layerHeightLabel } from '@/lib/format'
import { shortDate } from '@/lib/production'
import { PAYMENT_METHOD_LABEL, orderStage, type Tone } from '@/lib/orders'
import { useCheckout, useMyQuotes, useSyncOrder, type MyQuote } from '@/composables/useMyOrders'

const route = useRoute()
const { data: quotes, isPending } = useMyQuotes()
const checkout = useCheckout()
const sync = useSyncOrder()

const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const payingId = ref<string | null>(null)
const checkingId = ref<string | null>(null)

const returnedOrderId = computed(() => (typeof route.query.pedido === 'string' ? route.query.pedido : null))

// Ao abrir a página, confere no Mercado Pago os pedidos que ainda aguardam
// pagamento: é assim que o "Pago" aparece em localhost, onde o webhook não chega,
// e logo que o cliente volta do checkout.
let synced = false
watch(quotes, async (list) => {
  if (synced || !list) return
  synced = true
  const waiting = list.filter((q) => q.order?.status === 'AWAITING_PAYMENT')
  await Promise.allSettled(waiting.map((q) => sync.mutateAsync(q.order!.id)))
})

const returned = computed(() => quotes.value?.find((q) => q.order?.id === returnedOrderId.value) ?? null)

async function pay(quote: MyQuote, method: 'pix' | 'card') {
  error.value = null
  payingId.value = `${quote.order!.id}:${method}`
  try {
    const { checkoutUrl } = await checkout.mutateAsync({ orderId: quote.order!.id, method })
    window.location.assign(checkoutUrl)
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível abrir o pagamento.'
    payingId.value = null
  }
}

async function checkPayment(quote: MyQuote) {
  error.value = null
  notice.value = null
  checkingId.value = quote.order!.id
  try {
    const order = await sync.mutateAsync(quote.order!.id)
    if (order.status === 'AWAITING_PAYMENT') {
      notice.value = 'Ainda não recebemos a confirmação do Mercado Pago. Pix costuma cair em segundos; boleto, em até 2 dias úteis.'
    }
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível conferir o pagamento.'
  } finally {
    checkingId.value = null
  }
}

const toneClass: Record<Tone, string> = {
  neutral: 'bg-ink/5 text-steel',
  waiting: 'bg-amber-soft/30 text-ink',
  success: 'bg-sage/15 text-sage',
  danger: 'bg-red-600/10 text-red-700',
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper text-ink">
    <AppHeader />

    <main class="mx-auto w-full max-w-[880px] flex-1 px-6 py-12">
      <span class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Sua conta</span>
      <h1 class="mt-2 font-sans text-2xl font-semibold leading-none tracking-tight sm:text-3xl">Meus pedidos</h1>
      <p class="mt-3 font-sans text-sm text-steel">
        Seus orçamentos e pedidos. Quando um orçamento é aprovado, o pagamento fica disponível aqui.
      </p>

      <div
        v-if="returned && orderStage(returned).label === 'Pago'"
        role="status"
        class="mt-6 rounded-[12px] bg-sage/15 px-4 py-3 font-sans text-sm text-ink"
      >
        Pagamento confirmado. Obrigado! Seu pedido entra na fila de produção.
      </div>

      <p v-if="error" class="mt-6 font-mono text-[11px] text-red-600">{{ error }}</p>
      <p v-if="notice" role="status" class="mt-6 font-sans text-sm text-steel">{{ notice }}</p>
      <p v-if="isPending" class="mt-8 font-mono text-[11px] text-steel/70">Carregando…</p>
      <div v-else-if="!quotes?.length" class="mt-8 rounded-[16px] bg-cream p-6 font-sans text-sm text-steel ring-1 ring-black/5">
        Você ainda não fez nenhum orçamento.
        <RouterLink :to="{ path: '/', hash: '#orcamento' }" class="text-copper hover:text-copper-deep">
          Enviar um arquivo
        </RouterLink>
      </div>

      <div v-else class="mt-8 flex flex-col gap-4">
        <article
          v-for="quote in quotes"
          :key="quote.id"
          :class="[
            'rounded-[16px] bg-cream p-5 ring-1',
            quote.order && quote.order.id === returnedOrderId ? 'ring-copper' : 'ring-black/5',
          ]"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="font-sans text-base font-semibold text-ink [overflow-wrap:anywhere]">{{ quote.fileName }}</h2>
              <div class="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-steel">
                <span class="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" :style="{ background: quote.color.hex }" />
                {{ quote.material.name }} · {{ quote.color.name }} · {{ layerHeightLabel(quote.layerHeight.millimeters) }}mm ·
                {{ quote.quantity }} un. · {{ shortDate(quote.createdAt) }}
              </div>
            </div>
            <span
              :class="[
                'shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]',
                toneClass[orderStage(quote).tone],
              ]"
            >
              {{ orderStage(quote).label }}
            </span>
          </div>

          <div class="mt-3 font-sans text-sm text-ink">
            {{ brl(Number(quote.order?.totalPrice ?? quote.calculatedPrice)) }}
            <span v-if="quote.order?.payment?.status === 'APPROVED'" class="text-steel">
              · pago com {{ PAYMENT_METHOD_LABEL[quote.order.payment.method] ?? quote.order.payment.method }}
            </span>
          </div>

          <p v-if="quote.status === 'PENDING'" class="mt-2 font-sans text-xs text-steel">
            Estamos conferindo o arquivo. Quando aprovarmos, o pagamento aparece aqui.
          </p>

          <div v-if="orderStage(quote).canPay" class="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              class="rounded-[9px] bg-copper px-4 py-2.5 font-sans text-sm font-medium text-paper transition-colors hover:bg-copper-deep disabled:opacity-50"
              :disabled="payingId !== null"
              @click="pay(quote, 'pix')"
            >
              {{ payingId === `${quote.order!.id}:pix` ? 'Abrindo…' : 'Pagar com Pix' }} ·
              {{ brl(pixPrice(Number(quote.order!.totalPrice))) }} (−10%)
            </button>
            <button
              class="rounded-[9px] px-4 py-2.5 font-sans text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5 disabled:opacity-50"
              :disabled="payingId !== null"
              @click="pay(quote, 'card')"
            >
              {{ payingId === `${quote.order!.id}:card` ? 'Abrindo…' : 'Cartão ou boleto' }} ·
              {{ brl(Number(quote.order!.totalPrice)) }} · até 10x
            </button>
          </div>
          <button
            v-if="quote.order?.status === 'AWAITING_PAYMENT'"
            class="mt-3 font-sans text-xs text-steel hover:text-ink disabled:opacity-50"
            :disabled="checkingId === quote.order.id"
            @click="checkPayment(quote)"
          >
            {{ checkingId === quote.order.id ? 'Conferindo…' : 'Já paguei — conferir pagamento' }}
          </button>
        </article>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
