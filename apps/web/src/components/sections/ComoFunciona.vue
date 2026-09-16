<script setup lang="ts">
const passos = [
  {
    n: '01',
    t: 'Envie o arquivo',
    d: 'STL, 3MF ou STEP. Nossa equipe valida a geometria e orienta ajustes.',
  },
  {
    n: '02',
    t: 'Escolha a especificação',
    d: 'Material, cor, preenchimento e altura de camada conforme a função da peça.',
  },
  {
    n: '03',
    t: 'Impressão camada a camada',
    d: 'Fila técnica, monitoramento de cada extrusão e controle de qualidade.',
  },
  {
    n: '04',
    t: 'Acompanhe e receba',
    d: 'Status em tempo real, fotos do corte e envio com rastreio para todo o país.',
  },
]
</script>

<template>
  <section id="como" class="scroll-mt-4 bg-ink text-paper">
    <div class="mx-auto max-w-[1200px] px-6 py-14 lg:py-20">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="max-w-[40ch] text-balance font-sans text-2xl font-semibold leading-none tracking-tight sm:text-3xl">
          Do arquivo à peça
        </h2>
        <span class="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/40">4 passos</span>
      </div>
      <div class="mt-8 grid gap-px overflow-hidden rounded-[16px] bg-paper/10 ring-1 ring-paper/10 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(passo, i) in passos"
          :key="passo.n"
          class="layer-in bg-ink p-6"
          :style="{ animationDelay: `${0.05 + i * 0.07}s` }"
        >
          <span class="font-mono text-[11px] text-copper">{{ passo.n }}</span>
          <h3 class="mt-3 font-sans text-lg font-medium">{{ passo.t }}</h3>
          <p class="mt-2 text-pretty font-sans text-sm text-paper/60">{{ passo.d }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
