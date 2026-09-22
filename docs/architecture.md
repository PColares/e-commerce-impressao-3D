# Arquitetura — Crealio

Decisões de stack para o e-commerce de impressão 3D sob demanda. Ver também [design-system.md](./design-system.md).

## Stack

### Frontend — `apps/web`

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Vue 3 (Composition API) + TypeScript | Pedido do usuário |
| Build | Vite | Padrão do ecossistema Vue |
| Estilo | Tailwind CSS v4 (CSS-first config) | Mesma versão do protótipo; suporta OKLCH nativamente, sem precisar de `tailwind.config.ts` |
| Roteamento | Vue Router | — |
| Estado global | Pinia | Carrinho, sessão do usuário, estado do configurador de orçamento |
| Primitivos de UI | reka-ui + shadcn-vue | Equivalente Vue do Radix/shadcn usado no protótipo — acessibilidade pronta, visual customizável via Tailwind |
| Ícones | lucide-vue-next | Mesmo set do protótipo |
| Formulários | vee-validate + zod | Validação tipada, schema compartilhável com o backend |
| Data fetching | @tanstack/vue-query | Cache/refetch de chamadas à API |
| Utilitários | VueUse | — |
| Carrossel | embla-carousel-vue | Mesmo lib do protótipo (catálogo) |
| Toast | vue-sonner | Equivalente do `sonner` usado no protótipo |
| Visualização 3D (opcional, fase 2) | three.js + `@tresjs/core` | Preview do STL enviado antes de orçar |

### Backend — `apps/api`

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | NestJS (Node.js + TypeScript) | Decisão do usuário — controle total sobre motor de precificação, filas de pedido e integrações |
| ORM | Prisma | Migrations tipadas; provider MySQL com o adapter @prisma/adapter-mariadb |
| Banco de dados | MySQL | É o banco gerenciado do plano da Hostinger (Postgres exige VPS) |
| Autenticação | Passport (JWT) + refresh token | Login de clientes + área admin |
| Upload de arquivos 3D | Multer → armazenamento em object storage (S3-compatible: Cloudflare R2 ou AWS S3) | Arquivos STL/3MF/OBJ podem chegar a 200MB — não armazenar em disco/DB |
| Fila de jobs | BullMQ + Redis | Cálculo assíncrono de orçamento/preparação de slicing, envio de e-mails, geração de nota |
| Pagamento | SDK oficial Mercado Pago | Decisão do usuário — Pix, boleto e cartão nativos no Brasil |
| Validação | class-validator / class-transformer (ou zod compartilhado via pacote) | Consistência com o front |
| Documentação da API | Swagger (`@nestjs/swagger`) | — |

### Monorepo

```
/
├── apps/
│   ├── web/          # Vue 3 + Tailwind
│   └── api/           # NestJS + Prisma
├── packages/
│   └── shared/        # tipos e schemas zod compartilhados (ex: payload de orçamento, enums de material)
├── docs/
│   ├── design-system.md
│   └── architecture.md
└── pnpm-workspace.yaml
```

Gerenciador de pacotes: **pnpm** (workspaces nativos, mais rápido que npm para monorepo).

## Modelo de dados inicial (rascunho)

Entidades principais a modelar no Prisma:

- `User` (cliente / admin, roles)
- `Material` (PLA, PETG, ABS, Resina — com multiplicador de preço)
- `LayerHeight` (0.20 / 0.12 / 0.08mm — fator de preço)
- `Color` (paleta de cores disponíveis)
- `Product` (peças do catálogo pronto)
- `Quote` (orçamento gerado a partir de upload: arquivo, material, altura de camada, cor, quantidade, preço calculado)
- `Order` (pedido confirmado, vinculado a um `Quote` ou a `Product`s do catálogo, status de produção/envio)
- `Payment` (integração com Mercado Pago: id da transação, status, método)

## Hospedagem — Hostinger (app Node.js)

Decisão tomada em 2026-09-16, depois de ver o painel: o deploy é no produto **"web app em
Node.js"** da Hostinger (plano Business/Cloud), não em VPS. Isso trocou três coisas do plano
original:

- **Um único processo, não Docker Compose.** O produto implanta um app Node, então o NestJS também
  serve o build do Vue (`ServeStaticModule`) — um domínio, sem CORS, sem Nginx próprio.
- **MySQL em vez de PostgreSQL.** Esse plano não oferece Postgres (nos docs deles, Postgres só em
  VPS), e a decisão foi manter tudo na Hostinger em vez de usar um Postgres externo. O Prisma está
  em `provider = "mysql"` com o adapter `@prisma/adapter-mariadb`, e o ambiente local também roda
  MySQL para espelhar a produção. Trocar de provider foi barato porque só havia dados de seed.
- **Sem Redis.** O BullMQ (ainda não implementado) vai precisar de Upstash ou de outra abordagem.

O passo a passo, incluindo o empacotamento (`pnpm deploy:bundle` / `pnpm deploy:zip`) e a
verificação pós-upload, está em [deploy-hostinger.md](./deploy-hostinger.md).

Ainda pendente nessa frente:

- **Object storage (arquivos STL/3MF, até 200MB):** a Hostinger não oferece storage S3-compatible;
  a escolha segue sendo **Cloudflare R2** (free tier, sem custo de egress).
- **Domínio/DNS:** gerenciado no painel Hostinger.
- **CI/CD:** hoje o upload é manual, porque o import por Git estava desativado no painel. Quando
  voltar, dá redeploy automático a cada push.

> Se em algum momento a conta migrar para VPS, o desenho anterior volta a valer e fica melhor:
> Docker Compose com `api`, `postgres`, `redis` e `nginx` no mesmo servidor, com Postgres e Redis
> locais em vez de externos.

## Próximos passos sugeridos

1. Scaffolding do monorepo (pnpm workspaces) com `apps/web` e `apps/api`.
2. Configurar Tailwind v4 + tokens do design system em `apps/web`.
3. Modelar schema Prisma inicial e subir MySQL local (Docker).
4. Portar a landing page/configurador do protótipo para Vue, reaproveitando a lógica de cálculo de preço.
5. Desenhar as telas que não existem no protótipo: carrinho, checkout (Mercado Pago), página de produto, conta do cliente.
