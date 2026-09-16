import { describe, it, expect } from 'vitest';
import { withConnectionTimeouts } from './connection-url.js';

describe('withConnectionTimeouts', () => {
  it('adiciona timeouts quando a URL não define nenhum', () => {
    const url = new URL(withConnectionTimeouts('mysql://u:p@host:3306/banco'));

    expect(url.searchParams.get('connectTimeout')).toBe('5000');
    expect(url.searchParams.get('acquireTimeout')).toBe('5000');
  });

  it('respeita valores já definidos na URL', () => {
    const url = new URL(
      withConnectionTimeouts('mysql://u:p@host:3306/banco?connectTimeout=250&acquireTimeout=250'),
    );

    expect(url.searchParams.get('connectTimeout')).toBe('250');
    expect(url.searchParams.get('acquireTimeout')).toBe('250');
  });

  it('preserva host, credenciais, banco e outros parâmetros', () => {
    const url = new URL(withConnectionTimeouts('mysql://user:s3nha@db.host:3307/camada?ssl=true'));

    expect(url.username).toBe('user');
    expect(url.password).toBe('s3nha');
    expect(url.host).toBe('db.host:3307');
    expect(url.pathname).toBe('/camada');
    expect(url.searchParams.get('ssl')).toBe('true');
  });

  it('devolve string vazia sem explodir', () => {
    expect(withConnectionTimeouts('')).toBe('');
  });

  it('devolve o valor original quando não é uma URL válida', () => {
    // melhor deixar o driver reclamar com a mensagem dele do que mascarar aqui
    expect(withConnectionTimeouts('nao-e-url')).toBe('nao-e-url');
  });
});
