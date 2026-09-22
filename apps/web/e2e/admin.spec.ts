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
    const dialog = page.getByRole('dialog', { name: 'Novo produto' })
    await expect(dialog).toBeVisible()

    // Um texto com extensão .png: a API confere os bytes, não o nome.
    await dialog.getByLabel('Imagem do produto').setInputFiles({
      name: 'falsa.png',
      mimeType: 'image/png',
      buffer: Buffer.from('isto não é uma imagem'),
    })
    await expect(dialog.getByText('Envie uma imagem JPG, PNG ou WebP.')).toBeVisible()

    await dialog.getByLabel('Imagem do produto').setInputFiles('public/apple-touch-icon.png')
    const preview = dialog.getByRole('img', { name: 'Pré-visualização' })
    await expect(preview).toBeVisible()
    // Carregou de verdade (no dev o Vite precisa repassar /uploads para a API).
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    const imageUrl = await preview.getAttribute('src')
    expect(imageUrl).toMatch(/^\/uploads\/products\/.+\.png$/)

    await dialog.getByLabel('Nome').fill(name)
    await dialog.getByLabel('Descrição').fill('Criada pelo teste de ponta a ponta')
    await dialog.getByLabel('Preço base').fill('42.5')
    await dialog.getByLabel('Visível na loja').uncheck()
    await dialog.getByRole('button', { name: 'Salvar produto' }).click()
    await expect(dialog).toBeHidden()

    const row = page.getByRole('row').filter({ hasText: name })
    await expect(row).toContainText('R$ 42,50')
    await expect(row).toContainText('Oculto')
    await expect(row.getByRole('img')).toHaveAttribute('src', imageUrl!)

    // A imagem é servida pelo mesmo servidor da API.
    const image = await request.get(`http://localhost:3333${imageUrl}`)
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/png')

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

  test('admin cadastra cor digitando o hex', async ({ page, request }) => {
    const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`
    await registerUser(request, email)
    promote(email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/admin')
    await page.getByRole('tab', { name: 'Cores' }).click()

    const name = `Areia ${Date.now()}`
    await page.getByLabel('Nome').fill(name)
    const hex = page.getByLabel('Hex da cor')
    await hex.fill('#f5f5f0')
    // O seletor visual acompanha o que foi digitado.
    await expect(page.getByLabel('Seletor da cor')).toHaveValue('#f5f5f0')

    await hex.fill('f5f5')
    await page.getByRole('button', { name: 'Adicionar cor' }).click()
    await expect(page.getByText('Use o formato #RRGGBB')).toBeVisible()

    await hex.fill('#F5F5F0')
    await page.getByRole('button', { name: 'Adicionar cor' }).click()
    const row = page.getByRole('row').filter({ hasText: name })
    await expect(row).toContainText('#F5F5F0')

    // Oculta para não aparecer no configurador que os outros testes conferem.
    await row.getByRole('button', { name: 'Ocultar' }).click()
    await expect(row).toContainText('Oculto')
  })

  test('o modal de produto fecha com Esc sem salvar', async ({ page, request }) => {
    const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`
    await registerUser(request, email)
    promote(email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/admin')

    await page.getByRole('row').filter({ hasText: 'Braço articulado' }).getByRole('button', { name: 'Editar' }).click()
    const dialog = page.getByRole('dialog', { name: 'Editar produto' })
    await expect(dialog.getByLabel('Nome')).toHaveValue('Braço articulado')
    await dialog.getByLabel('Nome').fill('Nome que não deve ser salvo')

    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()
    await expect(page.getByRole('cell', { name: 'Braço articulado' })).toBeVisible()
  })

  test('nenhuma aba do painel alarga a página além da tela', async ({ page, request }) => {
    const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.com`
    await registerUser(request, email)
    promote(email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/admin')

    // As tabelas rolam na horizontal dentro do próprio quadro. Se algo escapa
    // (já aconteceu com um sr-only absoluto), o celular afasta o zoom e o modal
    // abre fora da tela.
    for (const tab of ['Produtos', 'Materiais', 'Cores', 'Camadas']) {
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('table')).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `aba ${tab}`).toBeLessThanOrEqual(0)
    }
  })
})
