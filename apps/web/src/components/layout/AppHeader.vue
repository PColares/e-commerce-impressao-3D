<script setup lang="ts">
import { ref } from 'vue'
import { Menu, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const mobileOpen = ref(false)

const sections = [
  { label: 'Orçamento', hash: '#orcamento' },
  { label: 'Catálogo', hash: '#catalogo' },
  { label: 'Como funciona', hash: '#como' },
]
</script>

<template>
  <header class="border-b border-line bg-paper">
    <div class="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
      <RouterLink to="/" class="flex flex-1 basis-0 items-center gap-2.5">
        <img src="/apple-touch-icon.png" alt="" class="size-7 shrink-0 rounded-[8px]" />
        <span class="font-sans text-[15px] font-semibold tracking-tight text-ink">
          Crealio
        </span>
        <span class="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-steel/60">3D</span>
      </RouterLink>

      <nav class="hidden items-center justify-center gap-8 font-sans text-sm text-steel md:flex">
        <RouterLink
          v-for="section in sections"
          :key="section.hash"
          :to="{ path: '/', hash: section.hash }"
          class="whitespace-nowrap transition-colors hover:text-copper"
        >
          {{ section.label }}
        </RouterLink>
      </nav>

      <div class="flex flex-1 basis-0 items-center justify-end gap-4">
        <template v-if="auth.user">
          <RouterLink
            v-if="auth.isAdmin"
            to="/admin"
            class="font-sans text-sm text-copper transition-colors hover:text-copper-deep"
          >
            Painel
          </RouterLink>
          <span
            class="hidden max-w-[24ch] truncate whitespace-nowrap font-mono text-[11px] text-steel/70 lg:inline"
            :title="auth.user.name"
          >
            {{ auth.user.name }}
          </span>
          <button
            class="font-sans text-sm text-steel transition-colors hover:text-copper"
            @click="auth.logout()"
          >
            Sair
          </button>
        </template>
        <RouterLink v-else to="/login" class="font-sans text-sm text-steel transition-colors hover:text-copper">
          Entrar
        </RouterLink>

        <RouterLink
          :to="{ path: '/', hash: '#orcamento' }"
          class="hidden whitespace-nowrap rounded-[8px] bg-ink px-3 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-steel sm:inline-block"
        >
          Enviar arquivo
        </RouterLink>

        <button
          class="grid size-9 place-items-center rounded-[8px] text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25 md:hidden"
          :aria-label="mobileOpen ? 'Fechar menu' : 'Abrir menu'"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="size-4" />
          <Menu v-else class="size-4" />
        </button>
      </div>
    </div>

    <nav v-if="mobileOpen" class="border-t border-line bg-paper md:hidden">
      <div class="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-3 font-sans text-sm text-steel">
        <RouterLink
          v-for="section in sections"
          :key="section.hash"
          :to="{ path: '/', hash: section.hash }"
          class="py-2 transition-colors hover:text-copper"
          @click="mobileOpen = false"
        >
          {{ section.label }}
        </RouterLink>
        <RouterLink
          to="/catalogo"
          class="py-2 transition-colors hover:text-copper"
          @click="mobileOpen = false"
        >
          Ver catálogo completo
        </RouterLink>
        <RouterLink
          v-if="auth.isAdmin"
          to="/admin"
          class="py-2 text-copper transition-colors hover:text-copper-deep"
          @click="mobileOpen = false"
        >
          Painel
        </RouterLink>
      </div>
    </nav>
  </header>
</template>
