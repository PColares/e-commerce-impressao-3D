<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ApiError } from '@/lib/api'
import { brl } from '@/lib/format'
import { useAdminProducts, useSaveProduct, type AdminProduct } from '@/composables/useAdmin'
import Button from '@/components/ui/Button.vue'

const { data: products, isPending } = useAdminProducts()
const save = useSaveProduct()

const editingId = ref<string | null>(null)
const formOpen = ref(false)
const error = ref<string | null>(null)

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

function openNew() {
  Object.assign(form, empty())
  editingId.value = null
  error.value = null
  formOpen.value = true
}

function openEdit(product: AdminProduct) {
  Object.assign(form, {
    name: product.name,
    slug: product.slug,
    description: product.description,
    imageUrl: product.imageUrl ?? '',
    basePrice: product.basePrice,
    material: product.material ?? '',
    layerHeightLabel: product.layerHeightLabel ?? '',
    specSheet: product.specSheet ?? '',
    active: product.active,
  })
  editingId.value = product.id
  error.value = null
  formOpen.value = true
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
    await save.mutateAsync({ id: editingId.value ?? undefined, data: payload() })
    formOpen.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível salvar.'
  }
}

function toggleActive(product: AdminProduct) {
  save.mutate({ id: product.id, data: { active: !product.active } })
}

const labelClass = 'font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70'
const fieldClass =
  'w-full rounded-[8px] bg-paper px-3 py-2.5 text-sm text-ink ring-1 ring-line placeholder:text-steel/50 focus:outline-none focus:ring-2 focus:ring-copper'
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-4">
      <p class="font-sans text-sm text-steel">
        {{ products?.length ?? 0 }} produtos · os ocultos não aparecem na loja
      </p>
      <Button @click="openNew">Novo produto</Button>
    </div>

    <form
      v-if="formOpen"
      class="mt-5 grid gap-4 rounded-[16px] bg-cream p-5 ring-1 ring-black/5 sm:grid-cols-2"
      @submit.prevent="onSubmit"
    >
      <h2 class="font-sans text-lg font-semibold tracking-tight sm:col-span-2">
        {{ editingId ? 'Editar produto' : 'Novo produto' }}
      </h2>

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
        <label :class="labelClass" for="p-image">Imagem (URL)</label>
        <input id="p-image" v-model="form.imageUrl" :class="fieldClass" placeholder="/products/foto.jpg" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="p-material">Material exibido</label>
        <input id="p-material" v-model="form.material" :class="fieldClass" placeholder="PETG" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label :class="labelClass" for="p-layer">Camada exibida</label>
        <input id="p-layer" v-model="form.layerHeightLabel" :class="fieldClass" placeholder="0.20mm" />
      </div>
      <div class="flex flex-col gap-1.5 sm:col-span-2">
        <label :class="labelClass" for="p-spec">Ficha técnica</label>
        <input id="p-spec" v-model="form.specSheet" :class="fieldClass" placeholder="12 cm · 48 g · preenchimento 20%" />
      </div>

      <label class="flex items-center gap-2 font-sans text-sm text-ink sm:col-span-2">
        <input v-model="form.active" type="checkbox" class="size-4 accent-copper" />
        Visível na loja
      </label>

      <p v-if="error" class="font-mono text-[11px] text-red-600 sm:col-span-2">{{ error }}</p>

      <div class="flex gap-3 sm:col-span-2">
        <Button type="submit" :disabled="save.isPending.value">Salvar produto</Button>
        <Button variant="secondary" @click="formOpen = false">Cancelar</Button>
      </div>
    </form>

    <p v-if="isPending" class="mt-6 font-mono text-[11px] text-steel/70">Carregando…</p>

    <div v-else class="mt-5 overflow-x-auto rounded-[16px] ring-1 ring-line">
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
              <div class="font-medium text-ink">{{ product.name }}</div>
              <div class="font-mono text-[11px] text-steel/60">/{{ product.slug }}</div>
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
