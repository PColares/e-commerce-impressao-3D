// O que o cliente vê em "Meus pedidos": junta o status do orçamento, do pedido
// e do pagamento numa etapa só, e diz se ainda cabe o botão de pagar.

export type Tone = 'neutral' | 'waiting' | 'success' | 'danger'

export interface StageInput {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  order: {
    id: string
    status: string
    totalPrice: string
    payment: { status: string; method: string } | null
  } | null
}

export interface Stage {
  label: string
  tone: Tone
  canPay: boolean
}

const ORDER_STAGE: Record<string, Stage> = {
  PAID: { label: 'Pago', tone: 'success', canPay: false },
  IN_PRODUCTION: { label: 'Em produção', tone: 'success', canPay: false },
  SHIPPED: { label: 'Enviado', tone: 'success', canPay: false },
  DELIVERED: { label: 'Entregue', tone: 'success', canPay: false },
  CANCELLED: { label: 'Cancelado', tone: 'danger', canPay: false },
}

export function orderStage(quote: StageInput): Stage {
  if (quote.status === 'PENDING') return { label: 'Em análise', tone: 'neutral', canPay: false }
  if (quote.status === 'REJECTED' || !quote.order) return { label: 'Recusado', tone: 'danger', canPay: false }

  const { order } = quote
  if (order.status !== 'AWAITING_PAYMENT') return ORDER_STAGE[order.status] ?? { label: order.status, tone: 'neutral', canPay: false }

  // Boleto/Pix gerado e não compensado: não oferece pagar de novo (cobraria duas vezes).
  if (order.payment?.status === 'PENDING') return { label: 'Pagamento em processamento', tone: 'waiting', canPay: false }
  if (order.payment?.status === 'REJECTED') return { label: 'Pagamento recusado', tone: 'danger', canPay: true }
  return { label: 'Aguardando pagamento', tone: 'waiting', canPay: true }
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão',
  ACCOUNT_MONEY: 'Saldo Mercado Pago',
}

// Situação do pedido como o admin vê (painel: orçamentos e cards da produção).
export const ORDER_STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  AWAITING_PAYMENT: { label: 'Aguardando pagamento', tone: 'waiting' },
  PAID: { label: 'Pago', tone: 'success' },
  IN_PRODUCTION: { label: 'Em produção', tone: 'success' },
  SHIPPED: { label: 'Enviado', tone: 'success' },
  DELIVERED: { label: 'Entregue', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'danger' },
}
