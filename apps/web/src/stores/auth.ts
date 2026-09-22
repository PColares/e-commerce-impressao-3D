import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'

interface AuthUser {
  id: string
  email: string
  name: string
  role: 'CUSTOMER' | 'ADMIN'
}

interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('crealio.token'))
  const user = ref<AuthUser | null>(JSON.parse(localStorage.getItem('crealio.user') ?? 'null'))

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  function persist(response: AuthResponse) {
    token.value = response.accessToken
    user.value = response.user
    localStorage.setItem('crealio.token', response.accessToken)
    localStorage.setItem('crealio.user', JSON.stringify(response.user))
  }

  async function register(payload: { email: string; password: string; name: string }) {
    const response = await api.post<AuthResponse>('/auth/register', payload)
    persist(response)
  }

  async function login(payload: { email: string; password: string }) {
    const response = await api.post<AuthResponse>('/auth/login', payload)
    persist(response)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('crealio.token')
    localStorage.removeItem('crealio.user')
  }

  return { token, user, isAdmin, register, login, logout }
})
