import { test, expect } from '@playwright/test'
import { API, adminEmail, login, PASSWORD, registerUser, uniqueEmail, uploadModel } from './helpers'

test.skip(!!process.env.E2E_BASE_URL, 'aprova o orçamento com o admin do banco local')

// Cliente com um orçamento aprovado (pedido aguardando pagamento).
async function customerWithApprovedQuote(request: import('@playwright/test').APIRequestContext, fileName: string) {
  const email = uniqueEmail('cliente')
  const token = await registerUser(request, email)
  const byName = <T extends { name: string }>(list: T[], name: string) => list.find((i) => i.name === name)!
  const material = byName(await (await request.get(`${API}/materials`)).json(), 'PLA')
  const color = byName(await (await request.get(`${API}/colors`)).json(), 'Preto')
  const [layer] = await (await request.get(`${API}/layer-heights`)).json()
  const quote = await (
    await request.post(`${API}/quotes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        fileName,
        fileKey: await uploadModel(request, token, fileName),
        materialId: material.id,
        layerHeightId: layer.id,
        colorId: color.id,
        quantity: 3,
      },
    })
  ).json()
  const admin = await (
    await request.post(`${API}/auth/login`, { data: { email: adminEmail(), password: PASSWORD } })
  ).json()
  const approved = await request.post(`${API}/admin/quotes/${quote.id}/approve`, {
    headers: { Authorization: `Bearer ${admin.accessToken}` },
  })
  expect(approved.ok()).toBe(true)
  return { email }
}

test.describe('Meus pedidos', () => {
  test('visitante é levado ao login', async ({ page }) => {
    await page.goto('/pedidos')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)pedidos/)
  })

  test('orçamento aprovado mostra os dois jeitos de pagar e o Pix leva ao Mercado Pago', async ({ page, request }) => {
    const fileName = `pedido-${Date.now()}.stl`
    const { email } = await customerWithApprovedQuote(request, fileName)

    // A preferência é criada de verdade no Mercado Pago; só a página externa não carrega.
    let checkoutUrl = ''
    await page.route(/mercadopago\.com/, (route) => {
      checkoutUrl = route.request().url()
      return route.fulfill({ contentType: 'text/html', body: '<h1>Checkout Mercado Pago</h1>' })
    })

    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    // No celular o link fica dentro do menu.
    const menu = page.getByRole('button', { name: 'Abrir menu' })
    if (await menu.isVisible()) await menu.click()
    await page.getByRole('link', { name: 'Meus pedidos' }).locator('visible=true').first().click()

    const order = page.getByRole('article').filter({ hasText: fileName })
    await expect(order).toContainText('Aguardando pagamento')
    // PLA × camada 0.20 (×0.85) × 3 × R$58 = R$147,90; Pix −10% = R$133,11
    await expect(order.getByRole('button', { name: /Pagar com Pix/ })).toContainText('R$ 133,11')
    await expect(order.getByRole('button', { name: /Cartão ou boleto/ })).toContainText('R$ 147,90')

    await order.getByRole('button', { name: /Pagar com Pix/ }).click()
    await expect(page.getByRole('heading', { name: 'Checkout Mercado Pago' })).toBeVisible()
    expect(checkoutUrl).toMatch(/^https:\/\/www\.mercadopago\.com\.br\/checkout\/v1\/redirect\?pref_id=/)
  })

  test('orçamento em análise ainda não tem botão de pagar', async ({ page, request }) => {
    const email = uniqueEmail('cliente')
    const token = await registerUser(request, email)
    const fileName = `em-analise-${Date.now()}.stl`
    const byName = <T extends { name: string }>(list: T[], name: string) => list.find((i) => i.name === name)!
    const [layer] = await (await request.get(`${API}/layer-heights`)).json()
    await request.post(`${API}/quotes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        fileName,
        fileKey: await uploadModel(request, token, fileName),
        materialId: byName(await (await request.get(`${API}/materials`)).json(), 'PLA').id,
        layerHeightId: layer.id,
        colorId: byName(await (await request.get(`${API}/colors`)).json(), 'Preto').id,
        quantity: 1,
      },
    })

    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/pedidos')

    const quote = page.getByRole('article').filter({ hasText: fileName })
    await expect(quote).toContainText('Em análise')
    await expect(quote.getByRole('button', { name: /Pagar/ })).toHaveCount(0)
  })
})
