const DEFAULT_TIMEOUT_MS = '5000';

/**
 * Garante timeouts de conexão na URL do banco.
 *
 * Sem isso, uma requisição que chega com o MySQL fora do ar fica pendurada
 * esperando conexão do pool — o proxy devolve 504 e o site parece travado, em
 * vez de falhar rápido com 500 e seguir servindo as páginas que não usam banco.
 * O driver mariadb lê esses parâmetros da própria connection string.
 */
export function withConnectionTimeouts(databaseUrl: string): string {
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const url = new URL(databaseUrl);
    for (const param of ['connectTimeout', 'acquireTimeout']) {
      if (!url.searchParams.has(param)) {
        url.searchParams.set(param, DEFAULT_TIMEOUT_MS);
      }
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}
