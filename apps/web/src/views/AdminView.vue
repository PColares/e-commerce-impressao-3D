<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AdminProducts from '@/components/admin/AdminProducts.vue'
import AdminReferenceList from '@/components/admin/AdminReferenceList.vue'
import type { Field } from '@/composables/useAdmin'
import { layerHeightLabel } from '@/lib/format'

type Tab = 'products' | 'materials' | 'colors' | 'layer-heights'

const tabs: { id: Tab; label: string }[] = [
  { id: 'products', label: 'Produtos' },
  { id: 'materials', label: 'Materiais' },
  { id: 'colors', label: 'Cores' },
  { id: 'layer-heights', label: 'Camadas' },
]
const active = ref<Tab>('products')

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
        <button
          v-for="tab in tabs"
          :key="tab.id"
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
      </div>

      <div class="mt-6">
        <AdminProducts v-if="active === 'products'" />
        <AdminReferenceList v-else-if="active === 'materials'" kind="materials" :fields="materialFields" noun="material" />
        <AdminReferenceList v-else-if="active === 'colors'" kind="colors" :fields="colorFields" noun="cor" />
        <AdminReferenceList v-else kind="layer-heights" :fields="layerFields" noun="camada" />
      </div>
    </main>

    <AppFooter />
  </div>
</template>
