<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <header class="border-b border-line bg-paper">
    <div class="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
      <RouterLink to="/" class="flex items-center gap-2.5">
        <span
          class="grid size-7 place-items-center rounded-[8px] bg-ink font-mono text-[11px] font-semibold tracking-tight text-paper"
        >
          C
        </span>
        <span class="font-sans text-[15px] font-semibold tracking-tight text-ink">
          Camada<span class="text-copper">.</span>
        </span>
        <span class="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-steel/60">3D</span>
      </RouterLink>

      <nav class="hidden items-center gap-8 font-sans text-sm text-steel md:flex">
        <a href="/#orcamento" class="transition-colors hover:text-copper">Orçamento</a>
        <a href="/#catalogo" class="transition-colors hover:text-copper">Catálogo</a>
        <a href="/#como" class="transition-colors hover:text-copper">Como funciona</a>
        <a href="/#prova" class="transition-colors hover:text-copper">Prova</a>
      </nav>

      <div class="flex items-center gap-4">
        <template v-if="auth.user">
          <span class="hidden font-mono text-xs text-steel sm:inline">{{ auth.user.name }}</span>
          <button class="font-sans text-sm text-steel transition-colors hover:text-copper" @click="auth.logout()">
            Sair
          </button>
        </template>
        <RouterLink v-else to="/login" class="font-sans text-sm text-steel transition-colors hover:text-copper">
          Entrar
        </RouterLink>

        <a
          href="/#orcamento"
          class="rounded-[8px] bg-ink px-3 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-steel"
        >
          Enviar arquivo
        </a>
      </div>
    </div>
  </header>
</template>
