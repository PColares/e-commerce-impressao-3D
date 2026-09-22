# Pendências e Próximos Passos — Crealio

Estado do projeto nesta sessão e o que falta para virar um e-commerce funcional. Ver também [architecture.md](./architecture.md), [design-system.md](./design-system.md) e [testing.md](./testing.md).

> O desenvolvimento aqui é **test-first**: teste falhando primeiro, implementação depois. Ver [testing.md](./testing.md).

## O que já está pronto

- Monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`).
- **Backend:** NestJS + Prisma 7 (com driver adapter `@prisma/adapter-mariadb`, obrigatório nessa versão) + MySQL. Schema completo (`User`, `Material`, `LayerHeight`, `Color`, `Product`, `Quote`, `Order`, `OrderItem`, `Payment`) migrado e populado via seed (`prisma/seed.ts`: PLA ×1/PETG ×1.25/ABS ×1.35/Resina ×1.8, camadas 0.20mm ×0.85/0.12mm ×1/0.08mm ×1.4 — valores conferidos com o protótipo original —, 5 cores, 3 produtos de demonstração com as fotos reais do protótipo).
  - **Auth:** `AuthModule` com JWT (`passport-jwt`), `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, guard `JwtAuthGuard` + decorator `@CurrentUser()`. Senhas com bcrypt.
  - **Catálogo:** `GET /api/materials`, `/api/layer-heights`, `/api/colors`, `/api/products` (inclui campos de exibição `material`, `layerHeightLabel`, `specSheet` no `Product`, usados nos cards do catálogo).
  - **Orçamento:** `POST /api/quotes` (protegido), calcula o preço com a mesma lógica de `packages/shared` (`calculateQuotePrice`) e persiste no banco; `GET /api/quotes` e `GET /api/quotes/:id` (só do próprio usuário).
  - Swagger em `/api/docs`, `ConfigModule` global, `ValidationPipe` global.
  - Testado ponta a ponta via curl: registro → login → listar catálogo → criar orçamento → preço batendo (R$58 × material × altura de camada × qtd).
- **`packages/shared`:** enums/tipos de domínio + `calculateQuotePrice()` (fórmula de precificação, única fonte da verdade usada tanto no back quanto no front) + schema zod `quoteRequestSchema`, compilado via `tsc` para `dist/`.
- **Frontend:** Vue 3 + TS + Vite + Tailwind v4 com os tokens do design system. A Home (`/`) é uma réplica fiel do protótipo Lovable (`camada-codigo-fonte`), remontada como página única com âncoras, e não mais uma tela genérica:
  - `AppHeader` — nav idêntica ao protótipo (Orçamento/Catálogo/Como funciona/Prova, todos rolando para as seções da home) + CTA "Enviar arquivo", com a parte de auth (Entrar/nome do usuário/Sair) à direita e menu hambúrguer no mobile. Os links usam `RouterLink` com hash (não `<a href>`), então navegar de `/catalogo` para uma seção da home não recarrega o SPA; o `scrollBehavior` do router faz a rolagem até a âncora.
  - `HeroConfigurator` (`#orcamento`) — hero + card do configurador lado a lado, pixel-a-pixel com o protótipo (dropzone tracejada, chips de material em grid de 4, swatches de cor com ring, chips de camada, stepper de quantidade, painel de preço escuro com botão de seta), mas **funcional de verdade**: material/altura de camada/cor vêm da API, preço calculado com `@crealio/shared`, submit cria o orçamento via `POST /api/quotes` (exige login).
  - `ComoFunciona` (`#como`), `ProvaSocial` (`#prova`) — conteúdo estático igual ao protótipo.
  - `CatalogoTeaser` (`#catalogo`) — mostra os 3 primeiros produtos da API no mesmo estilo de card do protótipo, com botão **"Ver catálogo completo"** que leva para `/catalogo`.
  - `/catalogo` — página expandida: lista todos os produtos, com filtro por material (chips) e ordenação por preço. Reaproveita o componente `ProductCard`.
  - `/login`, `/registro` — formulários ligados à store `auth` (Pinia, token em `localStorage`).
  - `/orcamento` agora é um redirect para `/` com âncora `#orcamento` (a página dedicada foi descontinuada — o configurador vive na Home, igual ao protótipo).
  - Componentes em `src/components/ui` (`Button`, `Input`), `src/components/layout` (`AppHeader`, `AppFooter`), `src/components/sections` (`ComoFunciona`, `CatalogoTeaser`, `ProvaSocial`), `src/components/HeroConfigurator.vue`, `src/components/ProductCard.vue`.
  - `@tanstack/vue-query` em uso (`src/composables/useCatalog.ts`) para os fetches de referência e produtos.
  - Imagens dos 3 produtos de demonstração copiadas do protótipo para `apps/web/public/products/`.
  - Formatação de moeda/medidas centralizada em `src/lib/format.ts` (`brl()` em pt-BR — `R$ 174,00`, não `R$ 174.00` — e `layerHeightLabel()` para exibir `0.20` em vez de `0.2`). O configurador abre com PLA + camada 0.12mm + qtd 3 pré-selecionados, batendo com a estimativa do protótipo (R$ 174,00 / R$ 156,60 no Pix / 10x de R$ 17,40).
  - `.layer-in` tem `opacity: 0` na base (como no protótipo): sem isso, os elementos com `animation-delay` apareciam por um instante antes de sumir e reanimar. Há também um bloco `prefers-reduced-motion` que desliga animação e scroll suave.
- **Infra local:** `docker-compose.dev.yml` sobe MySQL (porta **3307**, porque a 3306 já está em uso por outro projeto seu) e Redis (porta 6379). MySQL e não Postgres porque é o banco do plano da Hostinger.
- Build e typecheck validados: `vue-tsc --build` + `vite build` (web), `nest build` (api). `pnpm dev` sobe os dois em paralelo e foi testado servindo HTML/API reais juntos, incluindo as imagens estáticas do catálogo.

## Limitação conhecida importante

**Upload de arquivo é um placeholder.** `HeroConfigurator.vue` usa `URL.createObjectURL()` no lugar de subir o arquivo para um storage real — não existe endpoint de upload nem integração com object storage ainda. Isso significa que o `fileUrl` salvo no banco só é válido na sessão do navegador que criou o orçamento (não é uma URL real acessível depois). Precisa ser resolvido antes de ir para produção (ver item de Object Storage abaixo).

## Pendente — decisões que precisam de você

1. ~~**MySQL de produção**~~ — resolvido em 2026-09-22: banco `u520460695_kamadadb` criado no
   hPanel, tabelas e seed importados pelo phpMyAdmin com `kamada-banco.sql` (sem precisar de MySQL
   remoto), `DATABASE_URL` e `JWT_SECRET` configuradas no painel.
2. **Credenciais do Mercado Pago** (access token de produção/teste) — só precisa quando formos implementar o checkout de verdade.
3. **Object storage para os arquivos STL** (até 200MB cada): sugestão é Cloudflare R2 (free tier, sem custo de egress). Precisa criar a conta e gerar as chaves de API quando chegarmos nessa etapa — **bloqueia** o upload real (ver limitação acima).
4. ~~**Token da API Hostinger**~~ — resolvido em 2026-09-21 com a extensão **Hostinger Connector**
   do VS Code ("Hostinger: Set API Token"), que registra os servidores MCP no `~/.claude.json`. O
   `.mcp.json` do projeto foi removido: ele definia servidores com os mesmos nomes, lendo uma
   variável de ambiente vazia, e por ter precedência deixava o MCP respondendo 401.

> Resolvido em 2026-09-16: o plano é o produto **"web app em Node.js"** (Business/Cloud), não VPS.
> Isso já está refletido em `architecture.md` e `deploy-hostinger.md`.

## Pendente — backend (`apps/api`)

- [ ] **Módulo de Upload:** endpoint que recebe o arquivo 3D (Multer), valida extensão/tamanho (a validação de extensão já existe no frontend, mas precisa existir no backend também) e envia para o object storage, retornando a URL real — hoje o front usa um placeholder local (ver limitação acima).
- [x] **Guard/decorator de role** (`@Roles('ADMIN')` + `RolesGuard`). Admin se promove com `pnpm --filter api admin:promote <email>` (na Hostinger: `UPDATE` no phpMyAdmin).
- [x] **Catálogo — parte de escrita:** painel em `/admin` cria/edita/oculta/exclui produtos (com upload de foto), materiais, cores e alturas de camada. Excluir é recusado (409) para o que já está em orçamento/pedido. O filtro por material em `/catalogo` hoje é feito no cliente (poucos produtos) — se o catálogo crescer, mover para query params no backend (`GET /api/products?material=PETG`).
- [~] **Módulo de Order:** já existe aprovar/recusar orçamento no painel (aprovar cria o `Order`). Falta: pedido a partir de itens do catálogo, transições de status do pedido (`AWAITING_PAYMENT` → `PAID` → … → `DELIVERED`) ligadas ao pagamento, e o pedido refletir a produção (hoje o status do pedido não muda quando o job anda).
- [x] **Produção — fase 1** (2026-09-22): impressoras (status derivado dos jobs + manutenção/offline manual, filamentos carregados por posição, horas impressas, lembrete de manutenção), quadro de jobs (Fila → Preparando → Imprimindo → Acabamento → Conferência → Pronto), prazo com "Atrasado" no fuso de Belém, prioridade e registro de falhas (o job volta para a fila). Regras em `apps/api/src/production/production-rules.ts`.
- [ ] **Produção — fase 2:** estoque de filamento (bobinas, gramas descontadas ao terminar um job, alerta de estoque baixo) e custo por job (filamento + energia + falhas) para comparar com o preço cobrado.
- [ ] **Integração com a K2** (a pesquisar com a impressora em mãos): ler status/tempo restante pela rede para preencher o quadro sozinho.
- [ ] **Integração Mercado Pago:** instalar SDK oficial (`mercadopago`), criar preferência de pagamento no checkout, webhook para atualizar `Payment`/`Order` quando o pagamento for aprovado.
- [ ] **BullMQ:** configurar `BullModule` de fato (só a dependência está instalada, nenhuma fila/processor criado ainda) — ex: e-mail de confirmação, notificar admin de novo orçamento.
- [ ] **Testes do CatalogService:** `AuthService` e `QuotesService` já têm testes unitários; falta cobrir o `CatalogService` (ordenação dos materiais por preço, filtro de `active`).

## Pendente — frontend (`apps/web`)

- [ ] **Página de produto individual** (`/catalogo/:slug`) e **carrinho** (store Pinia de itens/quantidade/total) — o catálogo hoje lista e filtra, mas não tem "adicionar ao carrinho".
- [ ] **Checkout:** tela de finalização de compra integrando a preferência de pagamento do Mercado Pago (depende do backend implementar isso primeiro).
- [ ] **Área do cliente:** lista de orçamentos/pedidos do usuário logado com acompanhamento de status (o backend já expõe `GET /api/quotes`, falta a tela).
- [ ] **Componentes shadcn-vue restantes:** só `Button` e `Input` foram escritos; os demais listados em `design-system.md` seção 6 (Dialog, Select, Tabs, Toast via `vue-sonner` etc.) ainda não existem — o layout usa HTML/Tailwind cru em vários pontos (ex: chips de material/cor no configurador, select de ordenação no catálogo).
- [x] Favicon da Crealio (gerado no favicon.io).
- [ ] **Testes de componente:** o front tem Vitest configurado e testes de `lib/format` e da store `auth`, mas nenhum teste de componente com `@vue/test-utils` (a dependência já está instalada) — hoje o comportamento de UI é coberto pelo E2E.

## Pendente — infraestrutura / deploy

- [x] **Pacote de deploy** (`pnpm deploy:bundle` + `pnpm deploy:zip`) gerando um app Node
      autocontido, validado localmente com `npm install --omit=dev` + `npm start` e com os 21 testes
      E2E funcionais rodando contra ele. Ver [deploy-hostinger.md](./deploy-hostinger.md).
- [x] **Primeiro deploy de verdade** (2026-09-22): no ar em
      `https://violet-tapir-602845.hostingersite.com`, com catálogo vindo do MySQL. As duas causas do
      503 estão em [deploy-hostinger.md](./deploy-hostinger.md).
- [ ] **CI/CD:** hoje o upload é manual porque o import por Git está desativado no painel da
      Hostinger. Quando voltar, automatizar o redeploy por push.
- [ ] Configurar domínio/DNS no painel da Hostinger apontando para o app.
- [ ] Trocar `JWT_SECRET` e credenciais por valores de produção (nunca reaproveitar os de dev que
      estão em `apps/api/.env.example`).
- [ ] Dockerfiles/`docker-compose.prod.yml` só fazem sentido se a conta migrar para VPS — hoje o
      `docker-compose.dev.yml` é exclusivamente para desenvolvimento local (MySQL+Redis).

## Notas técnicas para quem for mexer no schema Prisma

- **`prisma migrate dev` não funciona neste ambiente** (shell não-interativo) — o Prisma 7 recusa rodar em modo não-interativo e pede `migrate deploy`. Fluxo usado nesta sessão para criar uma migration nova sem terminal interativo:
  1. Editar `prisma/schema.prisma`.
  2. Gerar o SQL: `pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > migration.sql` (ou usar `--from-migrations`/`--to-migrations` para um diff incremental, se preferir não recriar tudo do zero).
  3. Criar a pasta `prisma/migrations/<timestamp>_<nome>/` e mover o SQL pra lá como `migration.sql`.
  4. Aplicar com `pnpm exec prisma migrate deploy` (esse comando não é interativo e funciona normalmente).
  5. Rodar `pnpm exec prisma generate` para atualizar o client em `src/generated/prisma`.
- O client Prisma é gerado dentro de `src/generated/prisma` (não em `generated/` na raiz do app) de propósito — o `tsconfig.build.json` do Nest restringe `rootDir` a `./src`, então qualquer arquivo `.ts` fora dali (incluindo o client gerado) quebra o build.
- O seed roda com `tsx` (`pnpm exec prisma db seed`, comando configurado em `prisma7.config.ts` → `migrations.seed`). Não use `node --experimental-strip-types` para isso: a resolução de módulos ESM nativa do Node não sabe resolver os imports com extensão `.js` que apontam para arquivos `.ts` (convenção NodeNext), e o script falha com `ERR_MODULE_NOT_FOUND`.

## Como retomar

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # MySQL (porta 3307) + Redis
pnpm --filter @crealio/shared build                # se mexer em packages/shared
pnpm --filter api exec prisma generate            # se mexer no schema.prisma (ver seção acima para migrations)
pnpm dev                                          # roda web + api em paralelo
```

Web em `http://localhost:5173`, API em `http://localhost:3333/api`, Swagger em `http://localhost:3333/api/docs`.

Usuário de teste já pode ser criado via `POST /api/auth/register` (ver exemplos no Swagger).
