<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <header class="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">
    <RouterLink to="/" class="flex items-center gap-2">
      <div class="size-8 rounded-[8px] bg-ink flex items-center justify-center">
        <span class="font-mono text-xs text-paper">C</span>
      </div>
      <span class="font-semibold">Camada</span>
      <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">3D</span>
    </RouterLink>

    <nav class="flex items-center gap-6 text-sm">
      <RouterLink to="/orcamento" class="hover:text-copper">Orçamento</RouterLink>
      <RouterLink to="/catalogo" class="hover:text-copper">Catálogo</RouterLink>
      <template v-if="auth.user">
        <span class="font-mono text-xs text-steel">{{ auth.user.name }}</span>
        <button class="hover:text-copper" @click="auth.logout()">Sair</button>
      </template>
      <RouterLink v-else to="/login" class="hover:text-copper">Entrar</RouterLink>
    </nav>
  </header>
</template>
