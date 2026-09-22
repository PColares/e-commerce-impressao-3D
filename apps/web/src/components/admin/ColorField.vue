<script setup lang="ts">
import { computed } from 'vue'
import { isHexColor } from '@/lib/color'

const model = defineModel<string>({ required: true })
defineProps<{ id?: string }>()

// O <input type="color"> só aceita #rrggbb minúsculo; enquanto o texto estiver
// incompleto ele mantém a última cor válida em vez de pular para preto.
let lastValid = isHexColor(model.value) ? model.value.toLowerCase() : '#888888'
const pickerValue = computed(() => {
  if (isHexColor(model.value)) lastValid = model.value.toLowerCase()
  return lastValid
})
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      type="color"
      aria-label="Seletor da cor"
      :value="pickerValue"
      class="h-10 w-12 shrink-0 cursor-pointer rounded-[8px] bg-transparent"
      @input="model = ($event.target as HTMLInputElement).value.toUpperCase()"
    />
    <input
      :id="id"
      v-model="model"
      type="text"
      aria-label="Hex da cor"
      placeholder="#F5F5F0"
      maxlength="7"
      spellcheck="false"
      class="w-[110px] rounded-[8px] bg-paper px-3 py-2 font-mono text-sm uppercase text-ink ring-1 ring-line placeholder:normal-case placeholder:text-steel/50 focus:outline-none focus:ring-2 focus:ring-copper"
    />
  </div>
</template>
