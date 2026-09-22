<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { calculateQuotePrice, allowedModelExtensions, MAX_MODEL_FILE_SIZE_BYTES } from '@crealio/shared'
import { useAuthStore } from '@/stores/auth'
import { useMaterials, useLayerHeights, useColors } from '@/composables/useCatalog'
import { api, ApiError } from '@/lib/api'
import { brl, layerHeightLabel } from '@/lib/format'

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
// null = sem envio em andamento; 0–100 = porcentagem do upload do arquivo.
const uploadProgress = ref<number | null>(null)

// Pré-seleciona PLA, camada 0.12mm e a primeira cor assim que os dados chegam,
// para o card já abrir com uma estimativa coerente (igual ao protótipo).
watchEffect(() => {
  if (!materialId.value && materials.value?.[0]) materialId.value = materials.value[0].id

  if (!layerHeightId.value && layerHeights.value?.length) {
    const preferred =
      layerHeights.value.find((l) => Number(l.millimeters) === 0.12) ?? layerHeights.value[0]
    if (preferred) layerHeightId.value = preferred.id
  }

  if (!colorId.value && colors.value?.[0]) colorId.value = colors.value[0].id
})

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

// Material, camada e cor vêm da API. Até chegarem o botão fica desabilitado:
// antes, um clique rápido dizia "Selecione um arquivo" com o arquivo já escolhido.
const optionsReady = computed(() => Boolean(materialId.value && layerHeightId.value && colorId.value))

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

const installmentValue = computed(() =>
  priceBreakdown.value ? priceBreakdown.value.totalCard / priceBreakdown.value.installments : 0,
)

async function onSubmit() {
  if (!auth.user) {
    router.push('/login')
    return
  }
  if (!file.value) {
    fileError.value = fileError.value ?? 'Selecione um arquivo para continuar.'
    return
  }
  if (!optionsReady.value) return

  submitting.value = true
  submitError.value = null
  try {
    // Primeiro o arquivo (a API confere se é mesmo um modelo 3D), depois o
    // orçamento, que só guarda a chave do arquivo no servidor.
    uploadProgress.value = 0
    const { key } = await api.uploadWithProgress<{ key: string }>('/uploads/model', file.value, (percent) => {
      uploadProgress.value = percent
    })
    const quote = await api.post<{ id: string }>('/quotes', {
      fileName: file.value.name,
      fileKey: key,
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
    uploadProgress.value = null
  }
}
</script>

<template>
  <section id="orcamento" class="scroll-mt-4 bg-paper">
    <div class="mx-auto grid max-w-[1200px] items-start gap-10 px-6 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-16">
      <div class="layer-in">
        <div class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-copper">
          <span class="size-1.5 rounded-full bg-copper" /> Impressão sob demanda · Brasil
        </div>
        <h1 class="mt-5 max-w-[20ch] text-balance font-sans text-4xl font-semibold leading-none tracking-tight text-ink sm:text-5xl">
          Cada peça nasce camada por camada.
        </h1>
        <p class="mt-5 max-w-[46ch] text-pretty font-sans text-base text-steel/90">
          Envie seu arquivo em STL ou 3MF, escolha material, cor e resolução — e receba pronto para
          uso. Sem lote mínimo, sem burocracia. Precificação em reais, Pix com desconto e
          parcelamento.
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <a
            href="#configurador"
            class="rounded-[9px] bg-copper px-4 py-2.5 font-sans text-sm font-medium text-paper ring-1 ring-copper-deep/40 transition-colors hover:bg-copper-deep"
          >
            Calcular orçamento
          </a>
          <a
            href="#catalogo"
            class="rounded-[9px] px-4 py-2.5 font-sans text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:ring-ink/30"
          >
            Ver peças prontas
          </a>
        </div>
        <div class="mt-9 overflow-hidden border-y border-line">
          <div
            class="flex flex-wrap items-center gap-x-5 gap-y-1 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-steel/70 xl:gap-x-8"
          >
            <span class="whitespace-nowrap">Camadas 0.08–0.20mm</span>
            <span class="text-line">/</span>
            <span class="whitespace-nowrap">4 materiais</span>
            <span class="text-line">/</span>
            <span class="whitespace-nowrap">Pix −10%</span>
            <span class="text-line">/</span>
            <span class="whitespace-nowrap">Até 10x</span>
          </div>
        </div>
      </div>

      <div id="configurador" class="layer-in scroll-mt-6" style="animation-delay: 0.12s">
        <div class="overflow-hidden rounded-[16px] bg-cream ring-1 ring-black/5">
          <div class="flex items-center justify-between border-b border-line bg-cream px-5 py-3.5">
            <span class="font-mono text-[11px] uppercase tracking-[0.16em] text-ink">Configurador de orçamento</span>
            <span class="font-mono text-[10px] text-steel/60">estimativa</span>
          </div>

          <div v-if="submittedId" class="p-5">
            <p class="font-sans text-sm font-medium text-ink">Orçamento criado com sucesso.</p>
            <p class="mt-1 font-sans text-sm text-steel">
              Vamos conferir o arquivo. Quando aprovarmos, o pagamento fica disponível em
              <RouterLink to="/pedidos" class="text-copper hover:text-copper-deep">Meus pedidos</RouterLink>.
            </p>
          </div>

          <div v-else class="space-y-5 p-5">
            <div>
              <label
                class="grid cursor-pointer place-items-center rounded-[10px] border border-dashed border-steel/30 bg-paper/60 px-4 py-6 text-center transition-colors hover:border-steel/50"
              >
                <span class="max-w-full truncate font-sans text-sm font-medium text-ink">
                  {{ file ? file.name : 'Enviar .stl / .3mf' }}
                </span>
                <span class="mt-1 font-mono text-[11px] text-steel/70">até 200MB · análise em 24h</span>
                <input
                  type="file"
                  aria-label="Arquivo do modelo 3D"
                  :accept="allowedModelExtensions.join(',')"
                  class="hidden"
                  @change="onFileChange"
                />
              </label>
              <p v-if="fileError" class="mt-2 font-mono text-[11px] text-red-600">{{ fileError }}</p>
            </div>

            <div>
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70">Material</span>
              <div class="mt-2 grid grid-cols-4 gap-2">
                <button
                  v-for="material in materials"
                  :key="material.id"
                  type="button"
                  :aria-pressed="materialId === material.id"
                  @click="materialId = material.id"
                  :class="
                    materialId === material.id
                      ? 'rounded-[8px] bg-ink py-2 text-center font-sans text-[13px] font-medium text-paper'
                      : 'rounded-[8px] py-2 text-center font-sans text-[13px] text-steel ring-1 ring-steel/30 transition-colors hover:ring-steel/50'
                  "
                >
                  {{ material.name }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70">Cor</span>
                <div class="mt-2 flex gap-2">
                  <button
                    v-for="color in colors"
                    :key="color.id"
                    type="button"
                    :aria-label="color.name"
                    :aria-pressed="colorId === color.id"
                    @click="colorId = color.id"
                    :style="{ backgroundColor: color.hex }"
                    :class="[
                      'size-6 rounded-full',
                      colorId === color.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-cream' : 'ring-1 ring-steel/40',
                    ]"
                  />
                </div>
              </div>
              <div>
                <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70">Camada</span>
                <div class="mt-2 grid grid-cols-3 gap-2">
                  <button
                    v-for="layer in layerHeights"
                    :key="layer.id"
                    type="button"
                    :aria-pressed="layerHeightId === layer.id"
                    @click="layerHeightId = layer.id"
                    :class="
                      layerHeightId === layer.id
                        ? 'rounded-[7px] bg-ink py-2 text-center font-mono text-[12px] font-medium text-paper'
                        : 'rounded-[7px] py-2 text-center font-mono text-[12px] text-steel ring-1 ring-steel/30 transition-colors hover:ring-steel/50'
                    "
                  >
                    {{ layerHeightLabel(layer.millimeters) }}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70">Quantidade</span>
              <div class="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Diminuir"
                  @click="quantity = Math.max(1, quantity - 1)"
                  class="grid size-9 place-items-center rounded-[8px] font-mono text-sm text-steel ring-1 ring-steel/30 transition-colors hover:ring-steel/50"
                >
                  −
                </button>
                <output aria-label="Quantidade" class="w-8 text-center font-mono text-sm text-ink">{{ quantity }}</output>
                <button
                  type="button"
                  aria-label="Aumentar"
                  @click="quantity = Math.min(999, quantity + 1)"
                  class="grid size-9 place-items-center rounded-[8px] font-mono text-sm text-steel ring-1 ring-steel/30 transition-colors hover:ring-steel/50"
                >
                  +
                </button>
                <span class="ml-auto font-mono text-[11px] text-steel/60">prazo 4–6 dias</span>
              </div>
            </div>

            <div v-if="uploadProgress !== null" class="space-y-1.5">
              <div class="flex justify-between font-mono text-[11px] text-steel">
                <span>{{ uploadProgress < 100 ? 'Enviando arquivo…' : 'Conferindo o arquivo…' }}</span>
                <span>{{ uploadProgress }}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Envio do arquivo"
                :aria-valuenow="uploadProgress"
                aria-valuemin="0"
                aria-valuemax="100"
                class="h-1.5 overflow-hidden rounded-full bg-steel/15"
              >
                <div class="h-full rounded-full bg-copper transition-[width]" :style="{ width: `${uploadProgress}%` }" />
              </div>
            </div>

            <p v-if="submitError" class="font-mono text-[11px] text-red-600">{{ submitError }}</p>

            <div class="flex items-end justify-between rounded-[10px] bg-ink px-5 py-4 text-paper">
              <div>
                <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">Estimativa</span>
                <div v-if="priceBreakdown" class="mt-1 font-sans text-2xl font-semibold leading-none tracking-tight">
                  {{ brl(priceBreakdown.totalCard) }}
                </div>
                <div v-else class="mt-1 font-sans text-sm text-paper/60">Carregando…</div>
                <template v-if="priceBreakdown">
                  <div class="mt-1.5 font-mono text-[11px] text-copper">
                    {{ brl(priceBreakdown.totalPix) }} no Pix · −10%
                  </div>
                  <div class="mt-0.5 font-mono text-[11px] text-paper/55">
                    ou {{ priceBreakdown.installments }}x de {{ brl(installmentValue) }}
                  </div>
                </template>
              </div>
              <button
                type="button"
                aria-label="Solicitar orçamento"
                :disabled="submitting || !optionsReady"
                @click="onSubmit"
                class="grid size-10 place-items-center rounded-[8px] bg-copper font-sans text-sm font-medium text-paper transition-colors hover:bg-copper-deep disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
