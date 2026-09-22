import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import type { Color, LayerHeight, Material, Product } from './useCatalog'

// As rotas /admin devolvem também os inativos, por isso o campo active.
export type AdminProduct = Product & { active: boolean }
export type AdminMaterial = Material & { active: boolean }
export type AdminColor = Color & { active: boolean }
export type AdminLayerHeight = LayerHeight & { active: boolean }

export interface ProductInput {
  name: string
  slug?: string
  description: string
  imageUrl?: string
  basePrice: number
  material?: string
  layerHeightLabel?: string
  specSheet?: string
  active?: boolean
}

// Uma coluna editável das listas de materiais/cores/camadas.
export interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'color'
  // Formata o valor na tabela, ex: 0.08 -> "0.08 mm"
  display?: (value: string) => string
  step?: string
}

export type ReferenceKind = 'materials' | 'colors' | 'layer-heights'

// Cada lista do admin tem uma lista pública equivalente (vitrine/configurador)
// que precisa ser recarregada quando o admin muda algo.
const publicKey: Record<ReferenceKind | 'products', string> = {
  products: 'products',
  materials: 'materials',
  colors: 'colors',
  'layer-heights': 'layer-heights',
}

function useInvalidate(kind: ReferenceKind | 'products') {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['admin', kind] }),
      client.invalidateQueries({ queryKey: [publicKey[kind]] }),
    ])
}

export function useAdminProducts() {
  return useQuery({ queryKey: ['admin', 'products'], queryFn: () => api.get<AdminProduct[]>('/admin/products') })
}

export function useSaveProduct() {
  const invalidate = useInvalidate('products')
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<ProductInput> }) =>
      id ? api.patch<AdminProduct>(`/admin/products/${id}`, data) : api.post<AdminProduct>('/admin/products', data),
    onSuccess: invalidate,
  })
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>('/admin/uploads/product-image', file),
  })
}

export function useAdminReference<T>(kind: ReferenceKind) {
  return useQuery({ queryKey: ['admin', kind], queryFn: () => api.get<T[]>(`/admin/${kind}`) })
}

export function useSaveReference(kind: ReferenceKind) {
  const invalidate = useInvalidate(kind)
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Record<string, unknown> }) =>
      id ? api.patch(`/admin/${kind}/${id}`, data) : api.post(`/admin/${kind}`, data),
    onSuccess: invalidate,
  })
}
