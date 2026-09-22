import { test, expect } from '@playwright/test'
import { API, PASSWORD, adminEmail, login, openPanelAsAdmin, registerUser, uniqueEmail, uploadModel } from './helpers'

// Precisa da API local (não roda contra E2E_BASE_URL): o admin da execução é
// promovido direto no banco pelo global-setup, como se faz de verdade.
test.skip(!!process.env.E2E_BASE_URL, 'promove admin pelo banco local')

test.describe('Painel do administrador', () => {
  test('cliente comum não entra no painel', async ({ page, request }) => {
    const email = uniqueEmail('cliente')
    await registerUser(request, email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/$|\/#/)
    await expect(page.getByRole('link', { name: 'Painel' })).toHaveCount(0)
  })

  test('visitante é levado ao login e volta para o painel depois de entrar', async ({ page, request }) => {
    const email = adminEmail()

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?redirect=/)

    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  })

  test('admin cadastra um produto inativo e ele aparece na lista, mas não na vitrine', async ({ page, request }) => {
    const email = adminEmail()
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

    // Não deixa lixo de teste no painel.
    await row.getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(row).toHaveCount(0)
  })

  test('admin vê materiais, cores e alturas de camada', async ({ page, request }) => {
    const email = adminEmail()
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
    const email = adminEmail()
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/admin')
    await page.getByRole('tab', { name: 'Cores' }).click()

    const name = `Areia E2E ${Date.now()}`
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

    // Exclui para não sobrar no configurador nem no painel.
    await row.getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(row).toHaveCount(0)
  })

  test('o modal de produto fecha com Esc sem salvar', async ({ page, request }) => {
    const email = adminEmail()
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
    const email = adminEmail()
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/admin')

    // As tabelas rolam na horizontal dentro do próprio quadro. Se algo escapa
    // (já aconteceu com um sr-only absoluto), o celular afasta o zoom e o modal
    // abre fora da tela.
    for (const tab of ['Produtos', 'Materiais', 'Cores', 'Camadas', 'Orçamentos', 'Produção', 'Impressoras']) {
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByText('Carregando…')).toHaveCount(0)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `aba ${tab}`).toBeLessThanOrEqual(0)
    }
  })

  test('a barra de abas não mostra rolagem', async ({ page, request }) => {
    await openPanelAsAdmin(page, request)

    const tablist = page.getByRole('tablist')
    await expect(tablist).toBeVisible()
    const extra = await tablist.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(extra).toBeLessThanOrEqual(0)
  })

  test('admin exclui um produto sem pedidos, depois de confirmar', async ({ page, request }) => {
    const token = await openPanelAsAdmin(page, request)
    const name = `Excluível ${Date.now()}`
    const created = await request.post(`${API}/admin/products`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, description: 'para excluir', basePrice: 10, active: false },
    })
    expect(created.ok()).toBe(true)
    await page.reload()

    const row = page.getByRole('row').filter({ hasText: name })
    await row.getByRole('button', { name: 'Excluir' }).click()

    // Cancelar não apaga nada.
    const confirm = page.getByRole('alertdialog', { name: 'Excluir produto?' })
    await expect(confirm).toContainText(name)
    await confirm.getByRole('button', { name: 'Cancelar' }).click()
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: 'Excluir' }).click()
    await confirm.getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(row).toHaveCount(0)
  })

  test('excluir material usado em orçamento é recusado com explicação', async ({ page, request }) => {
    const token = await openPanelAsAdmin(page, request)
    const auth = { Authorization: `Bearer ${token}` }
    const name = `MatE2E${Date.now()}`

    // Material oculto (não aparece no configurador dos outros testes) usado num orçamento.
    const material = await (
      await request.post(`${API}/admin/materials`, { headers: auth, data: { name, priceMultiplier: 1, active: false } })
    ).json()
    const [layer] = await (await request.get(`${API}/layer-heights`)).json()
    // Cor fixa do seed: "a primeira da lista" pode ser uma cor que outro teste
    // está criando e vai tentar excluir em paralelo.
    const colors: { name: string; id: string }[] = await (await request.get(`${API}/colors`)).json()
    const color = colors.find((c) => c.name === 'Preto')!
    const quote = await request.post(`${API}/quotes`, {
      headers: auth,
      data: {
        fileName: 'peca.stl',
        fileKey: await uploadModel(request, token, 'peca.stl'),
        materialId: material.id,
        layerHeightId: layer.id,
        colorId: color.id,
        quantity: 1,
      },
    })
    expect(quote.ok()).toBe(true)

    await page.getByRole('tab', { name: 'Materiais' }).click()
    const row = page.getByRole('row').filter({ hasText: name })
    await row.getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir', exact: true }).click()

    await expect(page.getByText('aparece em 1 orçamento. Oculte em vez de excluir.')).toBeVisible()
    await expect(row).toBeVisible()
  })
})
