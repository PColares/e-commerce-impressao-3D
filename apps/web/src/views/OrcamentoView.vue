<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { calculateQuotePrice, allowedModelExtensions, MAX_MODEL_FILE_SIZE_BYTES } from '@camada/shared'
import { useAuthStore } from '@/stores/auth'
import { useMaterials, useLayerHeights, useColors } from '@/composables/useCatalog'
import { api, ApiError } from '@/lib/api'
import AppHeader from '@/components/layout/AppHeader.vue'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const router = useRouter()

const { data: materials } = useMaterials()
const { data: layerHeights } = useLayerHeights()
const { data: colors } = useColors()

const file = ref<File | null>(null)
const fileError = ref<string | null>(null)
const materialId = ref<string | null>(null)
const layerHeightId = ref<string | null>(null)
const colorId = ref<string | null>(null)
const quantity = ref(1)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submittedId = ref<string | null>(null)

function onFileChange(event: Event) {
  fileError.value = null
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0] ?? null
  if (!selected) return

  const extension = '.' + selected.name.split('.').pop()?.toLowerCase()
  if (!allowedModelExtensions.includes(extension as (typeof allowedModelExtensions)[number])) {
    fileError.value = `Formato não suportado. Use: ${allowedModelExtensions.join(', ')}`
    return
  }
  if (selected.size > MAX_MODEL_FILE_SIZE_BYTES) {
    fileError.value = 'Arquivo maior que 200MB.'
    return
  }
  file.value = selected
}

const selectedMaterial = computed(() => materials.value?.find((m) => m.id === materialId.value))
const selectedLayerHeight = computed(() => layerHeights.value?.find((l) => l.id === layerHeightId.value))

const priceBreakdown = computed(() => {
  if (!selectedMaterial.value || !selectedLayerHeight.value) return null
  return calculateQuotePrice(
    Number(selectedMaterial.value.priceMultiplier),
    Number(selectedLayerHeight.value.priceMultiplier),
    quantity.value,
  )
})

const canSubmit = computed(
  () => !!file.value && !!materialId.value && !!layerHeightId.value && !!colorId.value && quantity.value > 0,
)

async function onSubmit() {
  if (!auth.user) {
    router.push('/login')
    return
  }
  if (!file.value || !materialId.value || !layerHeightId.value || !colorId.value) return

  submitting.value = true
  submitError.value = null
  try {
    // TODO: enviar o arquivo para object storage real (Cloudflare R2/S3) e usar a URL retornada.
    // Object URL local usado como placeholder enquanto o upload não está implementado (ver docs/pending.md).
    const fileUrl = URL.createObjectURL(file.value)
    const quote = await api.post<{ id: string }>('/quotes', {
      fileName: file.value.name,
      fileUrl,
      materialId: materialId.value,
      layerHeightId: layerHeightId.value,
      colorId: colorId.value,
      quantity: quantity.value,
    })
    submittedId.value = quote.id
  } catch (e) {
    submitError.value = e instanceof ApiError ? e.message : 'Não foi possível gerar o orçamento.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <AppHeader />

    <main class="mx-auto max-w-[1200px] px-6 py-12 layer-in">
      <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper mb-3">&bull; Orçamento</p>
      <h1 class="text-3xl sm:text-4xl font-semibold leading-none tracking-tight mb-10">
        Envie seu arquivo e receba o preço na hora.
      </h1>

      <div v-if="submittedId" class="rounded-[16px] bg-cream ring-1 ring-black/5 p-8">
        <p class="text-lg font-medium mb-2">Orçamento criado com sucesso.</p>
        <p class="text-sm text-steel">ID: {{ submittedId }}</p>
      </div>

      <form v-else class="grid gap-10 lg:grid-cols-[1fr_360px]" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-8">
          <div>
            <label class="block text-sm font-medium mb-2">Arquivo 3D</label>
            <input
              type="file"
              :accept="allowedModelExtensions.join(',')"
              @change="onFileChange"
              class="block w-full text-sm rounded-[16px] bg-cream ring-1 ring-black/5 p-6 file:mr-4 file:rounded-[8px] file:border-0 file:bg-ink file:px-4 file:py-2 file:text-paper file:text-sm"
            />
            <p class="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-steel">
              .stl .3mf .obj .step — até 200MB
            </p>
            <p v-if="fileError" class="mt-2 text-sm text-red-600">{{ fileError }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-3">Material</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="material in materials"
                :key="material.id"
                type="button"
                @click="materialId = material.id"
                :class="[
                  'rounded-[8px] px-4 py-2 text-sm transition-colors',
                  materialId === material.id
                    ? 'bg-ink text-paper'
                    : 'ring-1 ring-steel/30 hover:ring-steel/60',
                ]"
              >
                {{ material.name }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-3">Altura de camada</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="layer in layerHeights"
                :key="layer.id"
                type="button"
                @click="layerHeightId = layer.id"
                :class="[
                  'rounded-[8px] px-4 py-2 text-sm transition-colors',
                  layerHeightId === layer.id
                    ? 'bg-ink text-paper'
                    : 'ring-1 ring-steel/30 hover:ring-steel/60',
                ]"
              >
                {{ layer.millimeters }}mm
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-3">Cor</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colors"
                :key="color.id"
                type="button"
                @click="colorId = color.id"
                :title="color.name"
                :class="[
                  'size-9 rounded-full ring-2 transition-shadow',
                  colorId === color.id ? 'ring-copper' : 'ring-transparent',
                ]"
                :style="{ backgroundColor: color.hex }"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-3">Quantidade</label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="size-9 rounded-[8px] ring-1 ring-ink/15"
                @click="quantity = Math.max(1, quantity - 1)"
              >
                −
              </button>
              <span class="w-10 text-center font-mono">{{ quantity }}</span>
              <button
                type="button"
                class="size-9 rounded-[8px] ring-1 ring-ink/15"
                @click="quantity = Math.min(999, quantity + 1)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <aside class="rounded-[16px] bg-ink text-paper p-8 h-fit">
          <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/60 mb-4">Resumo</p>

          <template v-if="priceBreakdown">
            <p class="text-2xl font-semibold mb-1">
              R$ {{ priceBreakdown.totalPix.toFixed(2) }}
              <span class="text-sm font-normal text-paper/60">no Pix</span>
            </p>
            <p class="text-sm text-copper mb-1">10% de desconto aplicado</p>
            <p class="text-sm text-paper/55">
              ou R$ {{ priceBreakdown.totalCard.toFixed(2) }} em até {{ priceBreakdown.installments }}x no cartão
            </p>
          </template>
          <p v-else class="text-sm text-paper/60">Selecione material e altura de camada para ver o preço.</p>

          <p v-if="submitError" class="mt-4 text-sm text-red-400">{{ submitError }}</p>

          <Button type="submit" variant="primary" class="w-full mt-6" :disabled="!canSubmit || submitting">
            {{ submitting ? 'Enviando…' : auth.user ? 'Confirmar orçamento' : 'Entrar para confirmar' }}
          </Button>
        </aside>
      </form>
    </main>
  </div>
</template>
