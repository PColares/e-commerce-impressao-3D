<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/api'
import AppHeader from '@/components/layout/AppHeader.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    await auth.login({ email: email.value, password: password.value })
    router.push('/orcamento')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Não foi possível entrar.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <AppHeader />
    <main class="mx-auto max-w-md px-6 py-16">
      <h1 class="text-2xl sm:text-3xl font-semibold leading-none tracking-tight mb-8">Entrar</h1>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <Input v-model="email" type="email" placeholder="E-mail" required />
        <Input v-model="password" type="password" placeholder="Senha" required />
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <Button type="submit" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</Button>
      </form>
      <p class="mt-6 text-sm text-steel">
        Não tem conta?
        <RouterLink to="/registro" class="text-copper hover:underline">Cadastre-se</RouterLink>
      </p>
    </main>
  </div>
</template>
