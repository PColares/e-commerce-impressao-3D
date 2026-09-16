# Deploy na Hostinger — app Node.js

Alvo: o produto **"web app em Node.js"** da Hostinger (disponível em plano Business ou qualquer
plano Cloud), implantado pelo hPanel.

## Por que existe um pacote de deploy

O repositório é um monorepo pnpm e a Hostinger roda `npm install` na raiz do que for enviado. O
`@camada/shared` está declarado como `workspace:*`, protocolo que o npm não entende — o install
falharia. Além disso o produto implanta **um** app Node, e aqui há dois (Vue e NestJS).

A solução está em `scripts/build-deploy.mjs`, que monta um app autocontido:

- o NestJS passa a servir o build do Vue (`ServeStaticModule`, em `apps/api/src/app.module.ts`),
  então é um único processo, um domínio e sem CORS;
- o `@camada/shared` vai como dependência `file:./vendor/shared`, já compilado;
- o `package.json` gerado tem só dependências de produção e `npm start`.

## Passo a passo

```bash
# 1. gera deploy/ (roda os builds de shared, web e api)
pnpm deploy:bundle

# 2. empacota o CONTEÚDO de deploy/ (sem node_modules) em camada-deploy.zip
pnpm deploy:zip
```

3. hPanel → seu web app Node.js → **Faça upload dos arquivos** → envie `camada-deploy.zip`.
4. Comando de start: `npm start`.
5. Configure as variáveis de ambiente **no painel** (nunca dentro do zip):
   - `DATABASE_URL` — Postgres externo, com `sslmode=require`
   - `JWT_SECRET` — valor longo e aleatório, diferente do de desenvolvimento
   - `PORT` — a Hostinger normalmente injeta; o app respeita essa variável

> O import por Git (GitHub/GitLab e URL de repositório público) estava **desativado** no painel em
> 2026-09-16, com o aviso de usar upload. Quando voltar, vale migrar para ele: dá redeploy
> automático a cada push. Nesse caso o repositório ainda precisará de um ajuste, porque a raiz do
> monorepo não é instalável com npm.

## Banco de dados

**Este plano não oferece PostgreSQL** — nos docs da Hostinger, Postgres exige VPS; no Business/Cloud
o banco gerenciado é MySQL. Optamos por manter Postgres e hospedá-lo fora (Neon ou Supabase, ambos
com free tier), o que mantém o schema, as migrations e os testes intactos. A própria Hostinger
documenta Node + Supabase.

Rode as migrations da sua máquina apontando para o banco de produção, assim não é preciso o CLI do
Prisma no servidor:

```bash
cd apps/api
DATABASE_URL="<url-de-producao>" pnpm exec prisma migrate deploy
DATABASE_URL="<url-de-producao>" pnpm exec prisma db seed
```

## Verificação depois do upload

A suíte E2E aponta para qualquer ambiente já no ar:

```bash
E2E_BASE_URL=https://seu-dominio pnpm --filter web exec playwright test \
  --project=chromium e2e/home.spec.ts e2e/catalogo.spec.ts
```

Rode só os specs funcionais: as baselines de regressão visual dependem da renderização local
(ver [testing.md](./testing.md)).

Esse mesmo comando foi usado para validar o pacote antes de subir — com o bundle rodando local via
`npm start`, os 21 testes funcionais passaram.

## Limitações conhecidas neste plano

- **Sem Redis**, então o BullMQ (ainda não implementado) precisará de um serviço externo como o
  Upstash, ou de uma abordagem sem fila.
- **Sem Docker**, ou seja, o `docker-compose.dev.yml` continua sendo só para desenvolvimento local.
- O upload é manual: sem CI/CD até o import por Git voltar.
