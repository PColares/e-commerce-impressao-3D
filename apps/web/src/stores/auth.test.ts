import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const post = vi.fn()
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: (...args: unknown[]) => post(...args) },
}))

const authResponse = {
  accessToken: 'token-123',
  user: { id: 'u1', email: 'a@b.com', name: 'Ana', role: 'CUSTOMER' as const },
}

async function freshStore() {
  vi.resetModules()
  setActivePinia(createPinia())
  const { useAuthStore } = await import('./auth')
  return useAuthStore()
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('começa deslogada quando não há nada no localStorage', async () => {
    const auth = await freshStore()
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('guarda token e usuário no login', async () => {
    post.mockResolvedValue(authResponse)
    const auth = await freshStore()

    await auth.login({ email: 'a@b.com', password: 'senha1234' })

    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'senha1234' })
    expect(auth.token).toBe('token-123')
    expect(auth.user?.name).toBe('Ana')
  })

  it('persiste a sessão no localStorage para sobreviver ao reload', async () => {
    post.mockResolvedValue(authResponse)
    const auth = await freshStore()

    await auth.register({ email: 'a@b.com', password: 'senha1234', name: 'Ana' })

    expect(localStorage.getItem('camada.token')).toBe('token-123')
    expect(JSON.parse(localStorage.getItem('camada.user')!)).toMatchObject({ name: 'Ana' })
  })

  it('recupera a sessão do localStorage ao inicializar', async () => {
    localStorage.setItem('camada.token', 'token-abc')
    localStorage.setItem('camada.user', JSON.stringify(authResponse.user))

    const auth = await freshStore()

    expect(auth.token).toBe('token-abc')
    expect(auth.user?.email).toBe('a@b.com')
  })

  it('limpa token, usuário e localStorage no logout', async () => {
    post.mockResolvedValue(authResponse)
    const auth = await freshStore()
    await auth.login({ email: 'a@b.com', password: 'senha1234' })

    auth.logout()

    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('camada.token')).toBeNull()
    expect(localStorage.getItem('camada.user')).toBeNull()
  })

  it('não guarda sessão se a API rejeitar o login', async () => {
    post.mockRejectedValue(new Error('Credenciais inválidas.'))
    const auth = await freshStore()

    await expect(auth.login({ email: 'a@b.com', password: 'errada' })).rejects.toThrow()

    expect(auth.token).toBeNull()
    expect(localStorage.getItem('camada.token')).toBeNull()
  })

  it('isAdmin só é verdadeiro para role ADMIN', async () => {
    post.mockResolvedValue(authResponse)
    const auth = await freshStore()
    expect(auth.isAdmin).toBe(false)

    await auth.login({ email: 'a@b.com', password: 'senha1234' })
    expect(auth.isAdmin).toBe(false)

    post.mockResolvedValue({ ...authResponse, user: { ...authResponse.user, role: 'ADMIN' } })
    await auth.login({ email: 'a@b.com', password: 'senha1234' })
    expect(auth.isAdmin).toBe(true)
  })
})
