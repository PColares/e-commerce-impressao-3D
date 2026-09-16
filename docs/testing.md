# Testes — Camada

O desenvolvimento neste projeto é **test-first**: escreva o teste falhando antes da implementação.

## Camadas e divisão de trabalho

| Camada | Ferramenta | Onde | O que cobre |
|---|---|---|---|
| Unitário | Vitest | `packages/shared`, `apps/web`, `apps/api` | Lógica pura e serviços isolados (Prisma mockado). Roda em ~1s. |
| E2E | Playwright | `apps/web/e2e/*.spec.ts` | Fluxo real no browser contra a API e o Postgres de verdade. |
| Regressão visual | Playwright (`toHaveScreenshot`) | `apps/web/e2e/visual.spec.ts` | Layout renderizado, comparado pixel a pixel com baselines versionadas. |

Regra prática para não duplicar: se dá para testar como função pura, é unitário; se depende de
navegação, layout ou integração entre front e API, é E2E. Não replique em unitário o que o E2E
já garante.

## Comandos

```bash
# unitários de todos os pacotes (shared + web + api)
pnpm test

# unitários de um pacote só
pnpm --filter @camada/shared test
pnpm --filter api test
pnpm --filter web test
pnpm --filter web test:watch

# E2E + visual (sobe API e web automaticamente; exige docker compose up -d)
pnpm test:e2e
pnpm --filter web test:e2e:ui         # modo interativo do Playwright
```

## Regressão visual

As baselines ficam em `apps/web/e2e/visual.spec.ts-snapshots/` e **são versionadas**.

```bash
# regenerar baselines depois de uma mudança de layout intencional
pnpm --filter web exec playwright test --update-snapshots=all
```

Dois detalhes que já causaram confusão aqui:

1. **`--update-snapshots` sem valor não reescreve nada** que já exista — o padrão é criar apenas
   as que faltam. Para forçar, use `--update-snapshots=all`.
2. **A tolerância importa.** Com `maxDiffPixelRatio: 0.01` (1%), mudanças bem visíveis — um overlay
   aparecendo, texto requebrando, card mudando de altura — passavam como "sem diferença". Hoje a
   config usa `maxDiffPixels: 200`, que absorve só ruído de antialiasing.

**Aviso de plataforma:** baseline de screenshot depende da renderização de fonte do sistema. Os
arquivos commitados têm sufixo `-win32` porque foram gerados no Windows. Rodar em CI Linux vai
falhar por diferença de renderização — nesse caso, gere as baselines dentro da imagem oficial
(`mcr.microsoft.com/playwright`) e commite os arquivos `-linux` junto, ou restrinja o
`visual.spec.ts` a um ambiente só.

O overlay do `vite-plugin-vue-devtools` é desligado durante os testes (a config do Playwright passa
`PLAYWRIGHT=1` para o servidor e o `vite.config.ts` omite o plugin), senão ele aparece nos
screenshots.

## Screenshot sob demanda

Para inspecionar uma tela sem escrever spec (útil para revisar layout), com o dev server no ar:

```bash
pnpm --filter web shot http://localhost:5173/ shots/home.png
```

Os PNGs vão para `apps/web/shots/`, que é ignorado pelo git.

## Convenções

- Selecione elementos por papel e texto acessível (`getByRole`, `getByLabel`), não por classe CSS —
  classe de Tailwind muda a cada ajuste de design e o teste quebra sem motivo. Os chips de seleção
  expõem `aria-pressed`, justamente para isso.
- Valores monetários nos testes usam o formato brasileiro (`R$ 174,00`), que é o que a UI renderiza.
- Os testes E2E assumem o banco populado pelo seed (`pnpm --filter api exec prisma db seed`):
  4 materiais, 3 alturas de camada, 5 cores e 3 produtos de demonstração.
