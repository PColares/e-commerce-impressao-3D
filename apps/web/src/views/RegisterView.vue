<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/api'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value })
    router.push({ path: '/', hash: '#orcamento' })
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Não foi possível criar a conta.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper text-ink">
    <AppHeader />

    <main class="flex flex-1 items-center justify-center px-6 py-16">
      <div class="layer-in w-full max-w-[400px]">
        <span class="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Sua conta</span>
        <h1 class="mt-2 font-sans text-2xl font-semibold leading-none tracking-tight sm:text-3xl">Criar conta</h1>
        <p class="mt-3 text-pretty font-sans text-sm text-steel/90">
          Leva menos de um minuto. Depois é só enviar o arquivo e orçar.
        </p>

        <form class="mt-7 rounded-[16px] bg-cream p-5 ring-1 ring-black/5" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-3">
            <label class="font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70" for="name">Nome</label>
            <Input id="name" v-model="name" placeholder="Seu nome" required />

            <label class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70" for="email">
              E-mail
            </label>
            <Input id="email" v-model="email" type="email" placeholder="seu@email.com" required />

            <label class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70" for="password">
              Senha
            </label>
            <Input id="password" v-model="password" type="password" placeholder="mínimo 8 caracteres" required />
          </div>

          <p v-if="error" class="mt-4 font-mono text-[11px] text-red-600">{{ error }}</p>

          <Button type="submit" class="mt-5 w-full" :disabled="loading">
            {{ loading ? 'Criando…' : 'Criar conta' }}
          </Button>
        </form>

        <p class="mt-5 font-sans text-sm text-steel">
          Já tem conta?
          <RouterLink to="/login" class="text-copper transition-colors hover:text-copper-deep">Entrar</RouterLink>
        </p>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
