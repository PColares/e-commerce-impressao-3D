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
4. Na tela "Revisar configurações de compilação":
   - **Configuração predefinida: NestJS.** O dropdown é alfabético e costuma abrir já rolado no
     final (React Router, Svelte, SvelteKit, Vite, Vue.js) — role para cima. Se não achar NestJS,
     use **Other**. **Nunca Vue.js:** esse preset trata o app como frontend estático.
   - **Versão do node:** **22.x** (a Hostinger suporta 18, 20, 22 e 24). Em 20.x funciona — foi
     testado em container `node:20` —, mas o `@nestjs/common` depende de `file-type@22`, que pede
     Node >= 22 e gera `EBADENGINE` no install.
   - **Comando de build:** `npm run build` serve. O pacote já sobe compilado, então esse script é um
     no-op proposital, só para o passo de build do painel não falhar.
   - **Start:** `npm run start`. **Diretório raiz:** `./`. **Diretório de saída:** `dist`.
5. Configure as variáveis de ambiente **no painel** (nunca dentro do zip):
   - `DATABASE_URL` — Postgres externo, com `sslmode=require`
   - `JWT_SECRET` — valor longo e aleatório, diferente do de desenvolvimento
   - `PORT` — a Hostinger normalmente injeta; o app respeita essa variável

> O import por Git (GitHub/GitLab e URL de repositório público) estava **desativado** no painel em
> 2026-09-16, com o aviso de usar upload. Quando voltar, vale migrar para ele: dá redeploy
> automático a cada push. Nesse caso o repositório ainda precisará de um ajuste, porque a raiz do
> monorepo não é instalável com npm.

## Armadilha do zip (já custou um deploy quebrado)

O `Compress-Archive` do PowerShell grava as entradas do zip com `\` como separador, o que viola a
spec do ZIP. No Windows parece tudo certo, mas em Linux os caminhos aninhados viram **nomes de
arquivo literais** — o deploy subiu e morreu com:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/generated/prisma/client.js'
imported from .../dist/prisma/prisma.service.js
```

O arquivo estava dentro do zip; o que não existia era a pasta `dist/generated/prisma/`.

Por isso `scripts/zip-deploy.mjs` usa o **bsdtar** (`%SystemRoot%\System32\tar.exe`) e não o
`Compress-Archive` nem o `tar` do Git Bash (esse é o GNU tar, que interpreta `C:\...` como host
remoto). O script ainda inspeciona o zip gerado e falha se achar qualquer `\` nas entradas, para o
erro não voltar silenciosamente.

## 503 depois de um build bem-sucedido

Se o build aparece como **Concluído** e o site responde **503**, o processo Node não está de pé —
não é problema de compilação. A causa que já aconteceu aqui:

**`JWT_SECRET` ausente.** O `AuthModule` resolve o segredo com `getOrThrow`, então sem a variável o
processo morre durante a inicialização e o proxy devolve 503 sem nenhuma pista na tela. Isso é
proposital (não se sobe autenticação com segredo improvisado) e está fixado por teste em
`apps/api/test/required-env.e2e-spec.ts`.

O que **não** derruba o boot: `DATABASE_URL` ausente ou banco fora do ar. O Prisma 7 com driver
adapter conecta de forma lazy, então o app sobe, serve o frontend, e só as rotas de dados falham
com 500 (coberto por `apps/api/test/boot-resilience.e2e-spec.ts`). Útil porque Postgres serverless
como o do Neon suspende por inatividade.

Se o 503 continuar mesmo com as variáveis configuradas, o próximo suspeito é a porta: o app escuta
em `process.env.PORT ?? 3333`, e o proxy precisa apontar para a porta que ele injeta.

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
