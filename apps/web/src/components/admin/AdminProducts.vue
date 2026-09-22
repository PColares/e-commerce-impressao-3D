<script setup lang="ts">
import { ref } from 'vue'
import { ImageOff } from 'lucide-vue-next'
import { brl } from '@/lib/format'
import { useAdminProducts, useSaveProduct, type AdminProduct } from '@/composables/useAdmin'
import Button from '@/components/ui/Button.vue'
import ProductFormDialog from './ProductFormDialog.vue'

const { data: products, isPending } = useAdminProducts()
const save = useSaveProduct()

const dialogOpen = ref(false)
const editing = ref<AdminProduct | null>(null)

function openNew() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(product: AdminProduct) {
  editing.value = product
  dialogOpen.value = true
}

function toggleActive(product: AdminProduct) {
  save.mutate({ id: product.id, data: { active: !product.active } })
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-4">
      <p class="font-sans text-sm text-steel">
        {{ products?.length ?? 0 }} produtos · os ocultos não aparecem na loja
      </p>
      <Button @click="openNew">Novo produto</Button>
    </div>

    <ProductFormDialog v-model:open="dialogOpen" :product="editing" />

    <p v-if="isPending" class="mt-6 font-mono text-[11px] text-steel/70">Carregando…</p>

    <div v-else class="relative mt-5 overflow-x-auto rounded-[16px] ring-1 ring-line">
      <table class="w-full min-w-[640px] text-left font-sans text-sm">
        <thead class="bg-cream font-mono text-[11px] uppercase tracking-[0.12em] text-steel/70">
          <tr>
            <th class="px-4 py-3 font-normal">Produto</th>
            <th class="px-4 py-3 font-normal">Preço</th>
            <th class="px-4 py-3 font-normal">Material</th>
            <th class="px-4 py-3 font-normal">Status</th>
            <th class="px-4 py-3 font-normal"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="border-t border-line">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-cream ring-1 ring-line">
                  <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="size-full object-cover" />
                  <ImageOff v-else class="size-4 text-steel/40" aria-label="Sem imagem" />
                </div>
                <div>
                  <div class="font-medium text-ink">{{ product.name }}</div>
                  <div class="font-mono text-[11px] text-steel/60">/{{ product.slug }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">{{ brl(Number(product.basePrice)) }}</td>
            <td class="px-4 py-3 text-steel">{{ product.material ?? '—' }}</td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
                  product.active ? 'bg-sage/15 text-sage' : 'bg-ink/10 text-steel',
                ]"
              >
                {{ product.active ? 'Na loja' : 'Oculto' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button class="text-copper hover:text-copper-deep" @click="openEdit(product)">Editar</button>
              <button class="ml-4 text-steel hover:text-ink" @click="toggleActive(product)">
                {{ product.active ? 'Ocultar' : 'Mostrar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
