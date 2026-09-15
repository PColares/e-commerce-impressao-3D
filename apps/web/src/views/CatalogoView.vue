<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import AppHeader from '@/components/layout/AppHeader.vue'

interface Product {
  id: string
  name: string
  description: string
  basePrice: string
  imageUrl: string | null
}

const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: () => api.get<Product[]>('/products'),
})
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <AppHeader />

    <main class="mx-auto max-w-[1200px] px-6 py-12 layer-in">
      <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper mb-3">&bull; Catálogo</p>
      <h1 class="text-3xl sm:text-4xl font-semibold leading-none tracking-tight mb-10">Peças prontas</h1>

      <div v-if="products?.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="product in products"
          :key="product.id"
          class="rounded-[16px] bg-cream ring-1 ring-black/5 p-6"
        >
          <h3 class="text-[17px] font-medium mb-2">{{ product.name }}</h3>
          <p class="text-sm text-steel mb-4">{{ product.description }}</p>
          <p class="font-mono text-sm">R$ {{ Number(product.basePrice).toFixed(2) }}</p>
        </article>
      </div>
      <p v-else class="text-sm text-steel">Nenhuma peça cadastrada ainda.</p>
    </main>
  </div>
</template>
