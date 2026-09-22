<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { ImagePlus, X } from 'lucide-vue-next'
import { ApiError } from '@/lib/api'
import { useSaveProduct, useUploadProductImage, type AdminProduct } from '@/composables/useAdmin'
import Button from '@/components/ui/Button.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ product: AdminProduct | null }>()

const save = useSaveProduct()
const upload = useUploadProductImage()

const IMAGE_MAX_BYTES = 5 * 1024 * 1024

const empty = () => ({
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  basePrice: '',
  material: '',
  layerHeightLabel: '',
  specSheet: '',
  active: true,
})
const form = reactive(empty())
const error = ref<string | null>(null)
const imageError = ref<string | null>(null)

// Recarrega o formulário a cada abertura: novo produto começa vazio, edição
// começa com os valores atuais (e Cancelar/Esc descarta o que foi digitado).
watch(open, (isOpen) => {
  if (!isOpen) return
  error.value = null
  imageError.value = null
  const product = props.product
  Object.assign(
    form,
    product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          imageUrl: product.imageUrl ?? '',
          basePrice: product.basePrice,
          material: product.material ?? '',
          layerHeightLabel: product.layerHeightLabel ?? '',
          specSheet: product.specSheet ?? '',
          active: product.active,
        }
      : empty(),
  )
})

async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  imageError.value = null
  if (file.size > IMAGE_MAX_BYTES) {
    imageError.value = 'Imagem acima de 5MB.'
    return
  }
  try {
    const { url } = await upload.mutateAsync(file)
    form.imageUrl = url
  } catch (e) {
    imageError.value = e instanceof ApiError ? String(e.message) : 'Não foi possível enviar a imagem.'
  }
}

// Campos opcionais vazios não vão no corpo: string vazia seria gravada como
// valor e o slug vazio impediria a API de gerar um a partir do nome.
function payload() {
  const optional = (value: string) => (value.trim() === '' ? undefined : value.trim())
  return {
    name: form.name.trim(),
    slug: optional(form.slug),
    description: form.description.trim(),
    imageUrl: optional(form.imageUrl),
    basePrice: Number(form.basePrice),
    material: optional(form.material),
    layerHeightLabel: optional(form.layerHeightLabel),
    specSheet: optional(form.specSheet),
    active: form.active,
  }
}

async function onSubmit() {
  error.value = null
  try {
    await save.mutateAsync({ id: props.product?.id, data: payload() })
    open.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível salvar.'
  }
}

const labelClass = 'font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70'
// text-base no celular: campo com fonte menor que 16px faz o navegador dar zoom
// ao focar, e o modal sai do quadro.
const fieldClass =
  'w-full rounded-[8px] bg-paper px-3 py-2.5 text-base text-ink sm:text-sm ring-1 ring-line placeholder:text-steel/50 focus:outline-none focus:ring-2 focus:ring-copper'
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px]" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[16px] bg-cream p-6 shadow-2xl ring-1 ring-black/10 focus:outline-none"
        :aria-describedby="undefined"
      >
        <div class="flex items-start justify-between gap-4">
          <DialogTitle class="font-sans text-lg font-semibold tracking-tight text-ink">
            {{ product ? 'Editar produto' : 'Novo produto' }}
          </DialogTitle>
          <DialogClose
            class="grid size-8 place-items-center rounded-[8px] text-steel transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="Fechar"
          >
            <X class="size-4" />
          </DialogClose>
        </div>

        <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <span :class="labelClass">Imagem</span>
            <div class="flex items-center gap-4">
              <div
                class="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-paper ring-1 ring-line"
              >
                <img
                  v-if="form.imageUrl"
                  :src="form.imageUrl"
                  alt="Pré-visualização"
                  class="size-full object-cover"
                />
                <ImagePlus v-else class="size-6 text-steel/50" />
              </div>
              <div class="flex flex-col items-start gap-2">
                <label
                  class="cursor-pointer rounded-[9px] bg-transparent px-4 py-2 text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5"
                  :class="{ 'pointer-events-none opacity-50': upload.isPending.value }"
                >
                  {{ upload.isPending.value ? 'Enviando…' : form.imageUrl ? 'Trocar imagem' : 'Enviar imagem' }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Imagem do produto"
                    class="sr-only"
                    @change="onImageSelected"
                  />
                </label>
                <button
                  v-if="form.imageUrl"
                  type="button"
                  class="font-sans text-xs text-steel hover:text-ink"
                  @click="form.imageUrl = ''"
                >
                  Remover imagem
                </button>
                <span class="font-mono text-[11px] text-steel/60">JPG, PNG ou WebP · até 5MB</span>
              </div>
            </div>
            <p v-if="imageError" class="font-mono text-[11px] text-red-600">{{ imageError }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label :class="labelClass" for="p-name">Nome</label>
            <input id="p-name" v-model="form.name" :class="fieldClass" required minlength="2" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="labelClass" for="p-slug">Endereço (slug)</label>
            <input id="p-slug" v-model="form.slug" :class="fieldClass" placeholder="gerado a partir do nome" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label :class="labelClass" for="p-desc">Descrição</label>
            <textarea id="p-desc" v-model="form.description" :class="fieldClass" rows="3" required />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="labelClass" for="p-price">Preço base</label>
            <input
              id="p-price"
              v-model="form.basePrice"
              :class="fieldClass"
              type="number"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="labelClass" for="p-material">Material exibido</label>
            <input id="p-material" v-model="form.material" :class="fieldClass" placeholder="PETG" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="labelClass" for="p-layer">Camada exibida</label>
            <input id="p-layer" v-model="form.layerHeightLabel" :class="fieldClass" placeholder="0.20mm" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="labelClass" for="p-spec">Ficha técnica</label>
            <input id="p-spec" v-model="form.specSheet" :class="fieldClass" placeholder="12 cm · 48 g · preenchimento 20%" />
          </div>

          <label class="flex items-center gap-2 font-sans text-sm text-ink sm:col-span-2">
            <input v-model="form.active" type="checkbox" class="size-4 accent-copper" />
            Visível na loja
          </label>

          <p v-if="error" class="font-mono text-[11px] text-red-600 sm:col-span-2">{{ error }}</p>

          <div class="flex justify-end gap-3 sm:col-span-2">
            <DialogClose as-child>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button type="submit" :disabled="save.isPending.value || upload.isPending.value">Salvar produto</Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
