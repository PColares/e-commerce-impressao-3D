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
