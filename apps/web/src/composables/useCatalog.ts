import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'

export interface Material {
  id: string
  name: string
  priceMultiplier: string
}

export interface LayerHeight {
  id: string
  millimeters: string
  priceMultiplier: string
}

export interface Color {
  id: string
  name: string
  hex: string
}

export function useMaterials() {
  return useQuery({ queryKey: ['materials'], queryFn: () => api.get<Material[]>('/materials') })
}

export function useLayerHeights() {
  return useQuery({ queryKey: ['layer-heights'], queryFn: () => api.get<LayerHeight[]>('/layer-heights') })
}

export function useColors() {
  return useQuery({ queryKey: ['colors'], queryFn: () => api.get<Color[]>('/colors') })
}
