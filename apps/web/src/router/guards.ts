import type { RouteLocationRaw } from 'vue-router'

interface Target {
  requiresAdmin: boolean
  fullPath: string
}

// Só esconde a tela: quem protege os dados de verdade é o RolesGuard da API.
export function adminRedirect(
  to: Target,
  user: { role: 'CUSTOMER' | 'ADMIN' } | null,
): true | RouteLocationRaw {
  if (!to.requiresAdmin) return true
  if (!user) return { name: 'login', query: { redirect: to.fullPath } }
  if (user.role !== 'ADMIN') return { path: '/' }
  return true
}

// Páginas do cliente (ex.: /pedidos): quem não está logado vai para o login e
// volta para a mesma página depois de entrar.
export function authRedirect(to: { requiresAuth: boolean; fullPath: string }, user: unknown): true | RouteLocationRaw {
  if (!to.requiresAuth || user) return true
  return { name: 'login', query: { redirect: to.fullPath } }
}
