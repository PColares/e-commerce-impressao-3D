<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ApiError } from '@/lib/api'
import { useAdminReference, useSaveReference, type Field, type ReferenceKind } from '@/composables/useAdmin'
import Button from '@/components/ui/Button.vue'

const props = defineProps<{ kind: ReferenceKind; fields: Field[]; noun: string }>()

type Row = Record<string, string> & { id: string; active: boolean }

const { data: rows, isPending } = useAdminReference<Row>(props.kind)
const save = useSaveReference(props.kind)

const editingId = ref<string | null>(null)
const draft = reactive<Record<string, string>>({})
const newRow = reactive<Record<string, string>>({})
const error = ref<string | null>(null)

function resetNew() {
  for (const field of props.fields) newRow[field.key] = field.type === 'color' ? '#888888' : ''
}
resetNew()

function toBody(values: Record<string, string>) {
  return Object.fromEntries(
    props.fields.map((field) => [field.key, field.type === 'number' ? Number(values[field.key]) : values[field.key]]),
  )
}

async function run(action: () => Promise<unknown>) {
  error.value = null
  try {
    await action()
    return true
  } catch (e) {
    error.value = e instanceof ApiError ? String(e.message) : 'Não foi possível salvar.'
    return false
  }
}

function startEdit(row: Row) {
  editingId.value = row.id
  for (const field of props.fields) draft[field.key] = String(row[field.key])
}

async function saveEdit(id: string) {
  if (await run(() => save.mutateAsync({ id, data: toBody(draft) }))) editingId.value = null
}

async function create() {
  if (await run(() => save.mutateAsync({ data: toBody(newRow) }))) resetNew()
}

function toggleActive(row: Row) {
  run(() => save.mutateAsync({ id: row.id, data: { active: !row.active } }))
}

const fieldClass =
  'w-full min-w-[90px] rounded-[8px] bg-paper px-3 py-2 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-copper'
</script>

<template>
  <section>
    <p class="font-sans text-sm text-steel">
      Itens ocultos somem do configurador de orçamento, mas continuam nos orçamentos antigos.
    </p>

    <p v-if="error" class="mt-3 font-mono text-[11px] text-red-600">{{ error }}</p>
    <p v-if="isPending" class="mt-6 font-mono text-[11px] text-steel/70">Carregando…</p>

    <div v-else class="mt-5 overflow-x-auto rounded-[16px] ring-1 ring-line">
      <table class="w-full min-w-[560px] text-left font-sans text-sm">
        <thead class="bg-cream font-mono text-[11px] uppercase tracking-[0.12em] text-steel/70">
          <tr>
            <th v-for="field in fields" :key="field.key" class="px-4 py-3 font-normal">{{ field.label }}</th>
            <th class="px-4 py-3 font-normal">Status</th>
            <th class="px-4 py-3 font-normal"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="border-t border-line">
            <template v-if="editingId === row.id">
              <td v-for="field in fields" :key="field.key" class="px-4 py-2">
                <input
                  v-model="draft[field.key]"
                  :type="field.type"
                  :step="field.step"
                  :aria-label="field.label"
                  :class="field.type === 'color' ? 'h-9 w-14 cursor-pointer' : fieldClass"
                />
              </td>
              <td class="px-4 py-2" />
              <td class="px-4 py-2 text-right whitespace-nowrap">
                <button class="text-copper hover:text-copper-deep" @click="saveEdit(row.id)">Salvar</button>
                <button class="ml-4 text-steel hover:text-ink" @click="editingId = null">Cancelar</button>
              </td>
            </template>
            <template v-else>
              <td v-for="field in fields" :key="field.key" class="px-4 py-3">
                <span v-if="field.type === 'color'" class="inline-flex items-center gap-2">
                  <span class="size-4 rounded-full ring-1 ring-black/10" :style="{ background: row[field.key] }" />
                  <span class="font-mono text-[12px] text-steel">{{ row[field.key] }}</span>
                </span>
                <template v-else>{{ field.display ? field.display(row[field.key]!) : row[field.key] }}</template>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
                    row.active ? 'bg-sage/15 text-sage' : 'bg-ink/10 text-steel',
                  ]"
                >
                  {{ row.active ? 'Ativo' : 'Oculto' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button class="text-copper hover:text-copper-deep" @click="startEdit(row)">Editar</button>
                <button class="ml-4 text-steel hover:text-ink" @click="toggleActive(row)">
                  {{ row.active ? 'Ocultar' : 'Mostrar' }}
                </button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <form
      class="mt-5 flex flex-wrap items-end gap-3 rounded-[16px] bg-cream p-4 ring-1 ring-black/5"
      @submit.prevent="create"
    >
      <div v-for="field in fields" :key="field.key" class="flex flex-col gap-1.5">
        <label
          :for="`new-${kind}-${field.key}`"
          class="font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70"
        >
          {{ field.label }}
        </label>
        <input
          :id="`new-${kind}-${field.key}`"
          v-model="newRow[field.key]"
          :type="field.type"
          :step="field.step"
          required
          :class="field.type === 'color' ? 'h-10 w-16 cursor-pointer' : fieldClass"
        />
      </div>
      <Button type="submit" :disabled="save.isPending.value">Adicionar {{ noun }}</Button>
    </form>
  </section>
</template>
