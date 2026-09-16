<script setup lang="ts">
import { computed } from 'vue'
import { useProducts } from '@/composables/useCatalog'
import ProductCard from '@/components/ProductCard.vue'

const { data: products } = useProducts()
const destaques = computed(() => products.value?.slice(0, 3) ?? [])
</script>

<template>
  <section id="catalogo" class="scroll-mt-4 bg-paper">
    <div class="mx-auto max-w-[1200px] px-6 py-14 lg:py-20">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Catálogo pronto</span>
          <h2 class="mt-2 max-w-[40ch] text-balance font-sans text-2xl font-semibold leading-none tracking-tight text-ink sm:text-3xl">
            Peças prontas para encomendar
          </h2>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <span class="font-mono text-[12px] text-steel/60">preços em R$ · Pix −10% · até 10x</span>
          <RouterLink
            to="/catalogo"
            class="whitespace-nowrap rounded-[9px] px-4 py-2.5 font-sans text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:ring-ink/30"
          >
            Ver catálogo completo
          </RouterLink>
        </div>
      </div>

      <div v-if="destaques.length" class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard
          v-for="(product, i) in destaques"
          :key="product.id"
          :product="product"
          :style="{ animationDelay: `${0.05 + i * 0.07}s` }"
        />
      </div>
    </div>
  </section>
</template>
