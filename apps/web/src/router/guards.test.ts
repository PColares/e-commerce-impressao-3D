import { describe, it, expect } from 'vitest'
import { adminRedirect, authRedirect } from './guards'

const customer = { role: 'CUSTOMER' as const }
const admin = { role: 'ADMIN' as const }

describe('adminRedirect', () => {
  it('deixa passar rotas que não são de admin', () => {
    expect(adminRedirect({ requiresAdmin: false, fullPath: '/catalogo' }, null)).toBe(true)
  })

  it('manda quem não está logado para o login, lembrando para onde ia', () => {
    expect(adminRedirect({ requiresAdmin: true, fullPath: '/admin' }, null)).toEqual({
      name: 'login',
      query: { redirect: '/admin' },
    })
  })

  it('manda o cliente para a home', () => {
    expect(adminRedirect({ requiresAdmin: true, fullPath: '/admin' }, customer)).toEqual({ path: '/' })
  })

  it('deixa o admin entrar', () => {
    expect(adminRedirect({ requiresAdmin: true, fullPath: '/admin' }, admin)).toBe(true)
  })
})

describe('authRedirect', () => {
  it('manda o visitante para o login lembrando a página', () => {
    expect(authRedirect({ requiresAuth: true, fullPath: '/pedidos?pedido=1' }, null)).toEqual({
      name: 'login',
      query: { redirect: '/pedidos?pedido=1' },
    })
  })

  it('deixa passar quem está logado ou rota pública', () => {
    expect(authRedirect({ requiresAuth: true, fullPath: '/pedidos' }, { role: 'CUSTOMER' })).toBe(true)
    expect(authRedirect({ requiresAuth: false, fullPath: '/' }, null)).toBe(true)
  })
})
