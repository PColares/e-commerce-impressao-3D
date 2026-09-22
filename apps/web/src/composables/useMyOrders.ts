import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import type { StageInput } from '@/lib/orders'

export interface MyQuote extends StageInput {
  id: string
  fileName: string
  quantity: number
  calculatedPrice: string
  createdAt: string
  material: { name: string }
  color: { name: string; hex: string }
  layerHeight: { millimeters: string }
}

export const useMyQuotes = () =>
  useQuery({ queryKey: ['my-quotes'], queryFn: () => api.get<MyQuote[]>('/quotes') })

// Cria a preferência e devolve o link do Checkout Pro.
export const useCheckout = () =>
  useMutation({
    mutationFn: ({ orderId, method }: { orderId: string; method: 'pix' | 'card' }) =>
      api.post<{ checkoutUrl: string }>(`/orders/${orderId}/checkout`, { method }),
  })

// Pergunta ao Mercado Pago pelos pagamentos do pedido (o webhook não chega em localhost).
export function useSyncOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post<{ status: string }>(`/orders/${orderId}/sync`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['my-quotes'] }),
  })
}
