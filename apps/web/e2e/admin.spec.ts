import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'

// Precisa da API local (não roda contra E2E_BASE_URL): o admin é promovido
// direto no banco pelo script admin:promote, como se faz de verdade.
test.skip(!!process.env.E2E_BASE_URL, 'promove admin pelo banco local')

const API = 'http://localhost:3333/api'
const PASSWORD = 'senha12345'

async function registerUser(request: import('@playwright/test').APIRequestContext, email: string) {
  const response = await request.post(`${API}/auth/register`, {
    data: { email, password: PASSWORD, name: 'Admin E2E' },
  })
  expect(response.ok()).toBe(true)
}

// O e-mail é gerado pelo próprio teste, então montar a linha de comando é seguro.
function promote(email: string) {
  execSync(`pnpm --filter api admin:promote ${email}`, { cwd: '../..', stdio: 'pipe' })
}

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe('Painel do administrador', () => {
  test('cliente comum não entra no painel', async ({ page, request }) => {
    const email = `cliente-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`
    await registerUser(request, email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/$|\/#/)
    await expect(page.getByRole('link', { name: 'Painel' })).toHaveCount(0)
  })

  test('visitante é levado ao login e volta para o painel depois de entrar', async ({ page, request }) => {
    const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`
    await registerUser(request, email)
    promote(email)

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?redirect=/)

    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  })

  test('admin cadastra um produto inativo e ele aparece na lista, mas não na vitrine', async ({ page, request }) => {
    const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`
    await registerUser(request, email)
    promote(email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')

    await page.getByRole('link', { name: 'Painel' }).first().click()
    await expect(page.getByRole('cell', { name: 'Braço articulado' })).toBeVisible()

    // Inativo para não mexer na vitrine que os outros testes conferem em paralelo.
    const name = `Peça E2E ${Date.now()}`
    await page.getByRole('button', { name: 'Novo produto' }).click()
    await page.getByLabel('Nome').fill(name)
    await page.getByLabel('Descrição').fill('Criada pelo teste de ponta a ponta')
    await page.getByLabel('Preço base').fill('42.5')
    await page.getByLabel('Visível na loja').uncheck()
    await page.getByRole('button', { name: 'Salvar produto' }).click()

    const row = page.getByRole('row').filter({ hasText: name })
    await expect(row).toContainText('R$ 42,50')
    await expect(row).toContainText('Oculto')

    const shop = await request.get(`${API}/products`)
    expect(JSON.stringify(await shop.json())).not.toContain(name)
  })

  test('admin vê materiais, cores e alturas de camada', async ({ page, request }) => {
    const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`
    await registerUser(request, email)
    promote(email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/admin')

    await page.getByRole('tab', { name: 'Materiais' }).click()
    await expect(page.getByRole('cell', { name: 'PETG', exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Cores' }).click()
    await expect(page.getByRole('cell', { name: 'Cobre', exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Camadas' }).click()
    await expect(page.getByRole('cell', { name: '0.08 mm' })).toBeVisible()
  })
})
