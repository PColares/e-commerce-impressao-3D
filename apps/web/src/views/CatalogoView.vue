<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProducts } from '@/composables/useCatalog'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/ProductCard.vue'

const { data: products } = useProducts()

const selectedMaterial = ref<string | null>(null)
const sortBy = ref<'recent' | 'price-asc' | 'price-desc'>('recent')

const materials = computed(() => {
  const unique = new Set(products.value?.map((p) => p.material).filter((m): m is string => !!m))
  return Array.from(unique)
})

const filteredProducts = computed(() => {
  let list = products.value ?? []
  if (selectedMaterial.value) {
    list = list.filter((p) => p.material === selectedMaterial.value)
  }
  list = [...list]
  if (sortBy.value === 'price-asc') list.sort((a, b) => Number(a.basePrice) - Number(b.basePrice))
  if (sortBy.value === 'price-desc') list.sort((a, b) => Number(b.basePrice) - Number(a.basePrice))
  return list
})
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <AppHeader />

    <main class="mx-auto max-w-[1200px] px-6 py-14 lg:py-20 layer-in">
      <span class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Catálogo pronto</span>
      <h1 class="mt-2 max-w-[40ch] text-balance font-sans text-2xl font-semibold leading-none tracking-tight text-ink sm:text-3xl">
        Peças prontas para encomendar
      </h1>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          @click="selectedMaterial = null"
          :class="[
            'rounded-[8px] px-3 py-1.5 font-mono text-[12px] transition-colors',
            selectedMaterial === null ? 'bg-ink text-paper' : 'ring-1 ring-steel/30 text-steel hover:ring-steel/50',
          ]"
        >
          Todos
        </button>
        <button
          v-for="material in materials"
          :key="material"
          type="button"
          @click="selectedMaterial = material"
          :class="[
            'rounded-[8px] px-3 py-1.5 font-mono text-[12px] transition-colors',
            selectedMaterial === material ? 'bg-ink text-paper' : 'ring-1 ring-steel/30 text-steel hover:ring-steel/50',
          ]"
        >
          {{ material }}
        </button>

        <select
          v-model="sortBy"
          class="ml-auto rounded-[8px] bg-cream px-3 py-1.5 font-mono text-[12px] text-ink ring-1 ring-line"
        >
          <option value="recent">Mais recentes</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </select>
      </div>

      <div v-if="filteredProducts.length" class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
      </div>
      <p v-else class="mt-8 text-sm text-steel">Nenhuma peça encontrada para esse filtro.</p>
    </main>

    <AppFooter />
  </div>
</template>
