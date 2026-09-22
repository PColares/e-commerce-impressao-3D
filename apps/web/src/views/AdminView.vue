<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AdminProducts from '@/components/admin/AdminProducts.vue'
import AdminReferenceList from '@/components/admin/AdminReferenceList.vue'
import AdminQuotes from '@/components/admin/AdminQuotes.vue'
import ProductionBoard from '@/components/admin/ProductionBoard.vue'
import AdminPrinters from '@/components/admin/AdminPrinters.vue'
import type { Field } from '@/composables/useAdmin'
import { layerHeightLabel } from '@/lib/format'

// O id vira o ?aba= da URL: recarregar ou salvar o link mantém a aba.
const tabs = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'cores', label: 'Cores' },
  { id: 'camadas', label: 'Camadas' },
  { id: 'orcamentos', label: 'Orçamentos', divider: true },
  { id: 'producao', label: 'Produção' },
  { id: 'impressoras', label: 'Impressoras' },
] as const
type Tab = (typeof tabs)[number]['id']

const route = useRoute()
const router = useRouter()
const active = computed<Tab>({
  get: () => tabs.find((tab) => tab.id === route.query.aba)?.id ?? 'produtos',
  set: (id) => router.replace({ query: { ...route.query, aba: id } }),
})

const multiplier: Field = {
  key: 'priceMultiplier',
  label: 'Multiplicador',
  type: 'number',
  step: '0.01',
  display: (value) => `×${Number(value).toFixed(2)}`,
}

const materialFields: Field[] = [{ key: 'name', label: 'Nome', type: 'text' }, multiplier]
const colorFields: Field[] = [
  { key: 'name', label: 'Nome', type: 'text' },
  { key: 'hex', label: 'Cor', type: 'color' },
]
const layerFields: Field[] = [
  {
    key: 'millimeters',
    label: 'Altura',
    type: 'number',
    step: '0.01',
    display: (value) => `${layerHeightLabel(value)} mm`,
  },
  multiplier,
]
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper text-ink">
    <AppHeader />

    <main class="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12">
      <span class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Administração</span>
      <h1 class="mt-2 font-sans text-2xl font-semibold leading-none tracking-tight sm:text-3xl">Painel</h1>

      <!-- A linha de baixo é uma sombra interna, não border: com border e o -mb-px
           das abas, o sublinhado vazava 1px e o overflow-x-auto virava rolagem vertical. -->
      <div
        role="tablist"
        class="mt-8 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-line)] [scrollbar-width:none]"
      >
        <template v-for="tab in tabs" :key="tab.id">
        <span v-if="'divider' in tab" aria-hidden="true" class="mx-2 my-2.5 w-px shrink-0 bg-line" />
        <button
          role="tab"
          :aria-selected="active === tab.id"
          :class="[
            'whitespace-nowrap border-b-2 px-4 py-2.5 font-sans text-sm transition-colors',
            active === tab.id ? 'border-copper text-ink' : 'border-transparent text-steel hover:text-ink',
          ]"
          @click="active = tab.id"
        >
          {{ tab.label }}
        </button>
        </template>
      </div>

      <div class="mt-6">
        <AdminProducts v-if="active === 'produtos'" />
        <AdminReferenceList v-else-if="active === 'materiais'" kind="materials" :fields="materialFields" noun="material" />
        <AdminReferenceList v-else-if="active === 'cores'" kind="colors" :fields="colorFields" noun="cor" />
        <AdminReferenceList v-else-if="active === 'camadas'" kind="layer-heights" :fields="layerFields" noun="camada" />
        <AdminQuotes v-else-if="active === 'orcamentos'" />
        <ProductionBoard v-else-if="active === 'producao'" />
        <AdminPrinters v-else />
      </div>
    </main>

    <AppFooter />
  </div>
</template>
