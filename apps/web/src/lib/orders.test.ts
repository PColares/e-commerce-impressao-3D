import { describe, it, expect } from 'vitest'
import { orderStage } from './orders'

const approved = (status: string, payment: { status: string; method: string } | null = null) => ({
  status: 'APPROVED' as const,
  order: { id: 'o1', status, totalPrice: '147.9', payment },
})

describe('orderStage', () => {
  it('orçamento ainda não avaliado', () => {
    expect(orderStage({ status: 'PENDING', order: null })).toMatchObject({ label: 'Em análise', canPay: false })
  })

  it('orçamento recusado', () => {
    expect(orderStage({ status: 'REJECTED', order: null })).toMatchObject({ label: 'Recusado', canPay: false })
  })

  it('aprovado e sem pagamento: pode pagar', () => {
    expect(orderStage(approved('AWAITING_PAYMENT'))).toMatchObject({ label: 'Aguardando pagamento', canPay: true })
  })

  it('boleto ou Pix gerado e ainda não compensado: aguarda sem oferecer pagar de novo', () => {
    expect(orderStage(approved('AWAITING_PAYMENT', { status: 'PENDING', method: 'BOLETO' }))).toMatchObject({
      label: 'Pagamento em processamento',
      canPay: false,
    })
  })

  it('tentativa recusada: pode tentar de novo', () => {
    expect(orderStage(approved('AWAITING_PAYMENT', { status: 'REJECTED', method: 'CREDIT_CARD' }))).toMatchObject({
      label: 'Pagamento recusado',
      canPay: true,
    })
  })

  it('pago e etapas seguintes', () => {
    expect(orderStage(approved('PAID', { status: 'APPROVED', method: 'PIX' }))).toMatchObject({ label: 'Pago', canPay: false })
    expect(orderStage(approved('IN_PRODUCTION')).label).toBe('Em produção')
    expect(orderStage(approved('SHIPPED')).label).toBe('Enviado')
    expect(orderStage(approved('DELIVERED')).label).toBe('Entregue')
  })
})
