#!/usr/bin/env node
// Testa uma DATABASE_URL de MySQL e diz em português o que está errado.
//
// Uso:
//   node scripts/check-db.mjs "mysql://usuario:senha@host:3306/banco"
//   node scripts/check-db.mjs            (usa a DATABASE_URL do ambiente)
//
// Também monta a URL para você, já com a senha codificada:
//   node scripts/check-db.mjs --montar --host=srv123.hstgr.io --user=u1_camada --password='sua:senha@' --database=u1_camada

import mariadb from 'mariadb'

const args = process.argv.slice(2)

function flag(name) {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

function montarUrl() {
  const host = flag('host')
  const user = flag('user')
  const password = flag('password') ?? ''
  const database = flag('database')
  const port = flag('port') ?? '3306'

  if (!host || !user || !database) {
    console.error('Faltou --host, --user ou --database.')
    process.exit(1)
  }

  // encodeURIComponent é o ponto do exercício: senha com @ : / # ? quebra a URL
  const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  console.log('\nDATABASE_URL (no painel da Hostinger, cole SEM as aspas):\n')
  console.log(url, '\n')
  return url
}

const url = args.includes('--montar') ? montarUrl() : (args.find((a) => !a.startsWith('--')) ?? process.env.DATABASE_URL)

if (!url) {
  console.error('Passe a URL como argumento ou defina DATABASE_URL.')
  process.exit(1)
}

let alvo
try {
  const parsed = new URL(url)
  alvo = `${parsed.hostname}:${parsed.port || '3306'}${parsed.pathname}`
} catch {
  console.error('Essa string não é uma URL válida. Formato: mysql://usuario:senha@host:3306/banco')
  process.exit(1)
}

console.log(`Conectando em ${alvo} ...`)

let conn
try {
  // allowPublicKeyRetrieval: sem isso, o MySQL 8 (caching_sha2_password) falha
  // com uma mensagem sobre chave RSA em vez de dizer que a senha está errada.
  // Aqui é uma ferramenta de diagnóstico local, então vale ter o erro verdadeiro.
  conn = await mariadb.createConnection({
    ...parseUrl(url),
    connectTimeout: 8000,
    allowPublicKeyRetrieval: true,
  })
  const [{ versao }] = await conn.query('SELECT VERSION() AS versao')
  const tabelas = await conn.query('SHOW TABLES')
  console.log(`\nOK — conectou. MySQL ${versao}`)
  console.log(`Tabelas no banco: ${tabelas.length}`)
  if (tabelas.length === 0) {
    console.log('Banco vazio: rode as migrations.\n  DATABASE_URL="<url>" pnpm --filter api exec prisma migrate deploy')
  }
} catch (error) {
  console.error('\nFALHOU:', error.message, '\n')
  console.error(diagnostico(error))
  process.exitCode = 1
} finally {
  await conn?.end()
}

function parseUrl(raw) {
  const u = new URL(raw)
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  }
}

function diagnostico(error) {
  const code = error.code ?? ''
  const errno = error.errno
  const texto = String(error.message ?? '')

  if (errno === 1045 || code === 'ER_ACCESS_DENIED_ERROR') {
    return [
      'Usuário ou senha recusados. Causas comuns:',
      '  - senha com caractere especial não codificada na URL (rode com --montar para gerar certo)',
      '  - o usuário não tem permissão para conectar deste IP',
      '    -> hPanel > Bancos de dados > MySQL remoto, libere o seu IP',
    ].join('\n')
  }
  if (errno === 1044) {
    return [
      'O usuário conectou, mas não tem acesso a ESSE banco. Verifique:',
      '  - o nome do banco (na Hostinger vem com prefixo, ex: u123456789_camada)',
      '  - se o usuário foi associado a esse banco no painel',
    ].join('\n')
  }
  if (errno === 1049 || code === 'ER_BAD_DB_ERROR') {
    return 'O banco não existe com esse nome. Na Hostinger o nome tem prefixo, algo como u123456789_camada.'
  }
  if (texto.includes('RSA public key')) {
    return [
      'Autenticação do MySQL 8 (caching_sha2_password) não completou. Quase sempre é senha errada;',
      'se a senha estiver certa, a conexão precisa de TLS: acrescente ?ssl=true na DATABASE_URL.',
    ].join('\n')
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code.includes('ENOTFOUND')) {
    return [
      'Não alcançou o servidor. Verifique:',
      '  - o host: para conectar de fora, use o host do "MySQL remoto", não localhost',
      '  - se o seu IP está liberado em hPanel > Bancos de dados > MySQL remoto',
    ].join('\n')
  }
  return 'Sem diagnóstico específico para esse erro — me mande a mensagem acima.'
}
