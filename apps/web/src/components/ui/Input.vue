<script setup lang="ts">
defineProps<{
  modelValue: string
  type?: string
  placeholder?: string
  required?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :required="required"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    class="w-full rounded-[8px] bg-cream px-4 py-3 text-sm text-ink ring-1 ring-line placeholder:text-steel/60 focus:outline-none focus:ring-2 focus:ring-copper"
  />
</template>
