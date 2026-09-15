# Design System — Camada (E-commerce de Impressão 3D sob Demanda)

> Extraído e adaptado do protótipo Lovable em `camada-codigo-fonte` (React + TanStack Start + Tailwind v4).
> Este documento é a fonte da verdade visual para a reconstrução em Vue 3 + Tailwind CSS.

## 1. Marca

- **Nome:** Camada
- **Tagline:** "Cada peça nasce camada por camada."
- **Posicionamento:** Impressão 3D sob demanda no Brasil. Copy 100% pt-BR, preços em BRL.
- **Tom de voz:** direto, técnico-artesanal, confiante. Nada de emojis ou tom "startup fofo".
- **Logo:** avatar quadrado sólido (`bg-ink` no header claro, `bg-paper` no footer escuro) com a letra "C" em mono, ao lado do wordmark "Camada" + um ponto final na cor copper. Tag pequena "3D" em mono ao lado do logo.
- **Mood visual:** minimalista, industrial/artesanal, neutro-quente (fundos "paper/cream", nunca branco puro), acentos tipográficos em monoespaçada. Sensação de "estúdio de manufatura", não de SaaS genérico. **Sem gradientes** — só blocos de cor sólida + rings/opacidade (`/5`, `/10`, `/40`, `/60`, `/70`).

## 2. Paleta de cores

Definir como CSS custom properties em OKLCH (Tailwind v4 aceita `oklch()` nativamente, sem precisar converter para hex).

### Paleta de marca (estática, sem variante dark separada)

| Token | Valor OKLCH | Uso |
|---|---|---|
| `--ink` | `oklch(0.19 0.008 270)` | Quase preto — texto principal, seções dark, header |
| `--graphite` | `oklch(0.25 0.008 270)` | Variante de ink, hover de superfícies escuras |
| `--steel` | `oklch(0.31 0.01 268)` | Cinza-azulado — texto secundário, rings inativos |
| `--paper` | `oklch(0.955 0.01 90)` | Off-white quente — fundo padrão do site |
| `--cream` | `oklch(0.92 0.019 88)` | Fundo de cards (catálogo, prova social) |
| `--line` | `oklch(0.85 0.024 90)` | Bordas sutis |
| `--copper` | `oklch(0.55 0.14 42)` | **Cor primária/CTA** — laranja queimado |
| `--copper-deep` | `oklch(0.46 0.13 43)` | Hover do copper |
| `--sage` | `oklch(0.53 0.035 120)` | Acento secundário (sucesso/orgânico) |
| `--amber-soft` | `oklch(0.75 0.11 82)` | Acento suave (destaques, badges) |

### Tokens semânticos (compatíveis shadcn/ui)

Manter o padrão shadcn (`background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`) mapeados para a paleta de marca:

- `background` = paper, `foreground` = ink
- `primary` = copper, `primary-foreground` = paper
- `card` = white/cream, `border`/`input` = line
- `destructive` = manter vermelho padrão shadcn (`oklch(0.577 0.245 27.3)`)

> No protótipo original o dark mode do shadcn estava definido mas não usado (sem toggle na UI). Decisão para o rebuild: **começar só com light mode**; dark mode fica no roadmap, não é prioridade de um e-commerce.

## 3. Tipografia

Google Fonts (preconnect + `display=swap`):

```
Space Grotesk: 400, 500, 600, 700  → --font-sans (padrão: headings, parágrafos, botões)
IBM Plex Mono: 400, 500, 600       → --font-mono (labels, eyebrows, preços, meta info)
```

**Convenção de uso do mono:** sempre `uppercase tracking-[0.12em]` a `tracking-[0.18em]`, tamanhos pequenos (`text-[10px]`/`[11px]`/`[12px]`). Usado para: eyebrows acima de H2, specs técnicas, preços, badges.

**Escala de headings:**

| Elemento | Classes |
|---|---|
| H1 | `text-4xl sm:text-5xl font-semibold leading-none tracking-tight` |
| H2 | `text-2xl sm:text-3xl font-semibold leading-none tracking-tight` |
| H3 | `text-lg font-medium` (ou `text-[17px] font-medium`) |
| Corpo | `text-sm` / `text-base`, com `text-pretty` / `text-balance` |

**Padrão de eyebrow** (label acima de cada H2): ponto colorido + `font-mono text-[11px] uppercase tracking-[0.16em] text-copper`.

## 4. Raio de borda (radius)

Base: `--radius: 0.625rem` (10px)

| Token | Valor | Uso comum |
|---|---|---|
| `sm` | 6px | inputs pequenos |
| `md` | 8px | botões |
| `lg` | 10px (base) | cards padrão |
| `xl` | 14px | cards de destaque |
| `2xl` | 18px | — |
| `3xl` | 22px | — |
| `4xl` | 26px | — |

No JSX original também aparecem valores arbitrários fixos: `rounded-[8px]`, `[9px]`, `[10px]`, `[14px]`, `[16px]` — manter esses valores exatos ao portar componentes específicos (botão CTA = 9px, cards de catálogo = 16px).

## 5. Layout e espaçamento

- **Container:** `mx-auto max-w-[1200px] px-6`
- **Ritmo de seções:** alternância forte de fundo — `bg-paper` (padrão) / `bg-ink` full-bleed (seção "Como funciona") / `bg-cream` (prova social) — blocos de contraste, não tons sutis de cinza.
- Sem customização de breakpoints — usar os defaults do Tailwind.

## 6. Componentes

### Botões

- **Primário/CTA:** pill, `bg-copper text-paper rounded-[9px] ring-1 ring-copper-deep/40`, hover `bg-copper-deep`.
- **Secundário:** outline, `ring-1 ring-ink/15`, fundo transparente.
- **CTA em seção escura:** `bg-ink` hover `bg-steel`.

### Cards

- **Catálogo:** `rounded-[16px] bg-cream ring-1 ring-black/5`.
- **Card invertido (dark):** `bg-ink text-paper`.

### Seletores (material, camada, cor) — padrão "chip"

- **Ativo:** sólido `bg-ink text-paper`.
- **Inativo:** `ring-1 ring-steel/30`, hover engrossa o ring.

### Painel de preço

- Número grande: `text-2xl font-semibold` dentro de painel `bg-ink`.
- Desconto Pix destacado em `copper`.
- Parcelamento em texto `paper/55%` (opacidade reduzida).

### Biblioteca de primitivos (portar como componentes Vue)

Baseado em shadcn/ui "new-york" style (Radix → equivalente Vue = **reka-ui**, base do shadcn-vue):
`accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, checkbox, collapsible, command, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toast (sonner), toggle, toggle-group, tooltip`.

Ícones: **Lucide** (`lucide-vue-next`), mesmo set do protótipo (`lucide-react`).

## 7. Animação

Única animação customizada — entrada em cascata:

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.layer-in {
  animation: fadeUp 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
```

Uso: aplicar `.layer-in` + `animation-delay` inline escalonado (`0.05s + i * 0.07s`) em filhos de grids/listas para efeito cascata ao carregar. Sem Framer Motion nem libs pesadas de animação — manter CSS puro também no Vue (ou trocar por `@vueuse/motion` só se necessário, mas não é obrigatório).

## 8. Funcionalidades específicas do domínio (referência funcional do protótipo)

Estas telas/blocos existem no protótipo (single-page) e precisam virar páginas/fluxos reais no rebuild:

- **Upload de arquivo 3D:** dropzone aceitando `.stl .3mf .obj .step`, limite 200MB.
- **Seletor de material:** PLA (×1), PETG (×1.25), ABS (×1.35), Resina (×1.8) — multiplicador de preço.
- **Seletor de altura de camada:** 0.20 / 0.12 / 0.08mm, cada um com fator de preço.
- **Seletor de cor:** 5 swatches.
- **Stepper de quantidade.**
- **Calculadora de preço ao vivo:** `preço_base (R$58/unidade) × material × fator_camada × quantidade`.
- **Desconto Pix:** 10% sobre o total.
- **Parcelamento:** até 10x.
- **Catálogo pronto:** grid de peças com ficha técnica por item.
- **Prova social:** estatísticas (12.400+ peças entregues, 4.9/5, aprovação em 48h) + depoimentos.

> No protótipo isso tudo é uma única landing page. No e-commerce real isso se desdobra em: página de orçamento/configurador (pode reaproveitar quase 1:1), catálogo com filtros, página de produto, carrinho, checkout, e fluxo de acompanhamento de pedido (que não existe no protótipo e precisa ser desenhado do zero).

## 9. O que reaproveitar vs. redesenhar

**Reaproveitar quase direto:** paleta, tipografia, radius, botões, cards, chips de seleção, padrão de eyebrow, calculadora de preço (lógica), animação de entrada.

**Não existe no protótipo — desenhar do zero:** carrinho, checkout, página de produto individual, área do cliente/login, acompanhamento de pedido, painel admin. Manter a mesma linguagem visual (copper/ink/paper/cream + mono para specs/preços) ao criar essas telas novas.
