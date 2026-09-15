<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <main class="min-h-screen bg-paper text-ink">
    <AppHeader />

    <section class="mx-auto max-w-[1200px] px-6 py-24 layer-in">
      <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper mb-3">
        &bull; Impressão 3D sob demanda
      </p>
      <h1 class="text-4xl sm:text-5xl font-semibold leading-none tracking-tight max-w-2xl">
        Cada peça nasce camada por camada.
      </h1>
      <RouterLink
        to="/orcamento"
        class="mt-8 inline-flex items-center rounded-[9px] bg-copper px-5 py-3 text-sm font-medium text-paper ring-1 ring-copper-deep/40 transition-colors hover:bg-copper-deep"
      >
        Orçar minha peça
      </RouterLink>
    </section>
  </main>
</template>
