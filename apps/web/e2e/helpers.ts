import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { ADMIN_FILE, E2E_PASSWORD } from './global-setup'

export const API = 'http://localhost:3333/api'
export const PASSWORD = E2E_PASSWORD

export const adminEmail = (): string => JSON.parse(readFileSync(ADMIN_FILE, 'utf8')).email

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`

// Cadastra um cliente e devolve o token dele.
export async function registerUser(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${API}/auth/register`, {
    data: { email, password: PASSWORD, name: 'Cliente E2E' },
  })
  expect(response.ok()).toBe(true)
  return (await response.json()).accessToken
}

export async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

// Admin logado e já no painel. Devolve o token para montar dados pela API.
export async function openPanelAsAdmin(page: Page, request: APIRequestContext): Promise<string> {
  const email = adminEmail()
  const response = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } })
  expect(response.ok()).toBe(true)
  await login(page, email)
  await page.waitForURL((url) => url.pathname === '/')
  await page.goto('/admin')
  return (await response.json()).accessToken
}

// Um cliente faz um orçamento pelo caminho de verdade (POST /quotes).
export async function createQuoteAsCustomer(request: APIRequestContext, fileName: string) {
  const token = await registerUser(request, uniqueEmail('cliente'))
  // Itens fixos do seed, não "o primeiro da lista": outros testes criam cores e
  // materiais em paralelo, e um orçamento usando um deles impediria excluí-lo.
  const byName = <T extends { name: string }>(list: T[], name: string) => list.find((item) => item.name === name)!
  const material = byName(await (await request.get(`${API}/materials`)).json(), 'PLA')
  const color = byName(await (await request.get(`${API}/colors`)).json(), 'Preto')
  const [layer] = await (await request.get(`${API}/layer-heights`)).json()
  const response = await request.post(`${API}/quotes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      fileName,
      fileUrl: 'https://exemplo.com/peca.stl',
      materialId: material.id,
      layerHeightId: layer.id,
      colorId: color.id,
      quantity: 1,
    },
  })
  expect(response.ok()).toBe(true)
  return { quote: await response.json(), material, color }
}
