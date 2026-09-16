<script setup lang="ts">
import type { Product } from '@/composables/useCatalog'

const props = defineProps<{ product: Product }>()

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const spec = [props.product.material, props.product.layerHeightLabel].filter(Boolean).join(' · ')
</script>

<template>
  <article class="layer-in group overflow-hidden rounded-[16px] bg-cream ring-1 ring-black/5">
    <img
      v-if="product.imageUrl"
      :src="product.imageUrl"
      :alt="`${product.name} impresso em 3D`"
      class="aspect-[4/3] w-full object-cover"
      loading="lazy"
    />
    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-sans text-[17px] font-medium leading-tight text-ink">{{ product.name }}</h3>
          <span v-if="spec" class="font-mono text-[11px] text-steel/60">{{ spec }}</span>
        </div>
        <span class="shrink-0 font-mono text-[11px] text-copper">{{ brl(Number(product.basePrice)) }}</span>
      </div>
      <div v-if="product.specSheet" class="mt-3 font-mono text-[11px] leading-relaxed text-steel/60">
        {{ product.specSheet }}
      </div>
      <div class="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span class="font-mono text-[11px] text-sage">Pix {{ brl(Number(product.basePrice) * 0.9) }}</span>
        <span class="font-mono text-[11px] text-steel/70">10x {{ brl(Number(product.basePrice) / 10) }}</span>
      </div>
    </div>
  </article>
</template>
