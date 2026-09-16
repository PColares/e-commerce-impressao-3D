# Camada — E-commerce de Impressão 3D sob Demanda

Monorepo do e-commerce de impressão 3D sob demanda "Camada".

## Stack

- **Frontend** (`apps/web`): Vue 3 + TypeScript + Vite + Tailwind CSS v4 + Pinia
- **Backend** (`apps/api`): NestJS + PostgreSQL + Prisma
- **Pagamento:** Mercado Pago
- **Hospedagem:** VPS Hostinger (Docker Compose + Nginx)

Detalhes completos em [docs/architecture.md](docs/architecture.md) e [docs/design-system.md](docs/design-system.md). Estado atual do projeto e próximos passos em [docs/pending.md](docs/pending.md).

Desenvolvimento é **test-first** — como rodar e escrever os testes está em [docs/testing.md](docs/testing.md).

## Estrutura

```
apps/
  web/      # frontend Vue
  api/      # backend NestJS
packages/
  shared/   # tipos e schemas compartilhados
docs/       # documentação de arquitetura e design system
```

## Desenvolvimento

Pré-requisitos: Node.js 20+, pnpm, Docker (para Postgres/Redis locais).

```bash
pnpm install

# subir Postgres (porta 5433) + Redis local
docker compose -f docker-compose.dev.yml up -d

# aplicar migrations e popular dados de referência (materiais, cores, alturas de camada)
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed

# rodar web + api em paralelo
pnpm dev

# testes
pnpm test        # unitários (shared + web + api)
pnpm test:e2e    # E2E + regressão visual no browser
```

Web em `http://localhost:5173`, API em `http://localhost:3333/api`, Swagger em `http://localhost:3333/api/docs`.
