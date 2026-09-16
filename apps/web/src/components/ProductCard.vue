<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/composables/useCatalog'
import { brl } from '@/lib/format'

const props = defineProps<{ product: Product }>()

const spec = computed(() =>
  [props.product.material, props.product.layerHeightLabel].filter(Boolean).join(' · '),
)
const price = computed(() => Number(props.product.basePrice))
</script>

<template>
  <article class="layer-in flex flex-col overflow-hidden rounded-[16px] bg-cream ring-1 ring-black/5">
    <img
      v-if="product.imageUrl"
      :src="product.imageUrl"
      :alt="`${product.name} impresso em 3D`"
      class="aspect-[4/3] w-full object-cover"
      loading="lazy"
    />
    <div v-else class="grid aspect-[4/3] w-full place-items-center bg-paper/60">
      <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-steel/50">sem foto</span>
    </div>

    <div class="flex flex-1 flex-col p-5">
      <div class="flex-1">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="font-sans text-[17px] font-medium leading-tight text-ink">{{ product.name }}</h3>
            <span v-if="spec" class="font-mono text-[11px] text-steel/60">{{ spec }}</span>
          </div>
          <span class="shrink-0 font-mono text-[11px] text-copper">{{ brl(price) }}</span>
        </div>

        <div v-if="product.specSheet" class="mt-3 font-mono text-[11px] leading-relaxed text-steel/60">
          {{ product.specSheet }}
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span class="font-mono text-[11px] text-sage">Pix {{ brl(price * 0.9) }}</span>
        <span class="font-mono text-[11px] text-steel/70">10x {{ brl(price / 10) }}</span>
      </div>
    </div>
  </article>
</template>
