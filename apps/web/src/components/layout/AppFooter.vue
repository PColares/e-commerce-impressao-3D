<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-ink text-paper">
    <div class="mx-auto max-w-[1200px] px-6 py-14">
      <div class="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div class="flex items-center gap-2.5">
            <span
              class="grid size-7 place-items-center rounded-[8px] bg-paper font-mono text-[11px] font-semibold text-ink"
            >
              C
            </span>
            <span class="font-sans text-[15px] font-semibold tracking-tight">
              Camada<span class="text-copper">.</span>
            </span>
          </div>
          <p class="mt-4 max-w-[34ch] text-pretty font-sans text-sm text-paper/55">
            Estúdio de impressão 3D sob demanda. Camada sobre camada, do arquivo ao objeto.
          </p>
          <form class="mt-5 flex max-w-[280px] gap-2" @submit.prevent>
            <input
              type="email"
              placeholder="seu@email.com"
              class="flex-1 rounded-[8px] bg-graphite px-3 py-2 font-sans text-sm text-paper outline-none placeholder:text-paper/40 focus:ring-1 focus:ring-copper"
            />
            <button class="rounded-[8px] bg-copper px-4 font-sans text-sm font-medium text-paper transition-colors hover:bg-copper-deep">
              Enviar
            </button>
          </form>
        </div>
        <div>
          <h4 class="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/40">Produtos</h4>
          <ul class="mt-4 space-y-2.5 font-sans text-sm text-paper/70">
            <li>
              <RouterLink :to="{ path: '/', hash: '#orcamento' }" class="transition-colors hover:text-copper">
                Orçamento sob medida
              </RouterLink>
            </li>
            <li><RouterLink to="/catalogo" class="transition-colors hover:text-copper">Peças prontas</RouterLink></li>
            <li>Materiais e cores</li>
            <li>Tabela de prazos</li>
          </ul>
        </div>
        <div>
          <h4 class="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/40">Ajuda</h4>
          <ul class="mt-4 space-y-2.5 font-sans text-sm text-paper/70">
            <li>Como enviar arquivo</li>
            <li>Rastrear pedido</li>
            <li>Trocas e devoluções</li>
            <li>Fale conosco</li>
          </ul>
        </div>
        <div>
          <h4 class="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/40">Pagamento</h4>
          <ul class="mt-4 space-y-2.5 font-sans text-sm text-paper/70">
            <li>PIX · 10% de desconto</li>
            <li>Cartão em até 10x</li>
            <li>Boleto bancário</li>
            <li>CNPJ com NF-e</li>
          </ul>
        </div>
      </div>
      <div class="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 pt-6">
        <span class="font-mono text-[11px] text-paper/40">© {{ currentYear }} Camada · São Paulo, BR</span>
        <div class="flex gap-5 font-mono text-[11px] text-paper/40">
          <span>Termos</span>
          <span>Privacidade</span>
        </div>
      </div>
    </div>
  </footer>
</template>
