import { test, expect } from '@playwright/test'

test.describe('Home — hero e configurador', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('mostra o hero com a headline da marca', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cada peça nasce camada por camada.')
    await expect(page.getByText('Configurador de orçamento')).toBeVisible()
  })

  test('lista os materiais na ordem do mais barato para o mais caro', async ({ page }) => {
    const materialChips = page.locator('#configurador').getByRole('button', {
      name: /^(PLA|PETG|ABS|Resina)$/i,
    })
    await expect(materialChips).toHaveText(['PLA', 'PETG', 'ABS', 'Resina'])
  })

  test('mostra as alturas de camada com duas casas decimais', async ({ page }) => {
    const layerChips = page.locator('#configurador').getByRole('button', { name: /^0\.\d{2}$/ })
    await expect(layerChips).toHaveText(['0.20', '0.12', '0.08'])
  })

  test('abre com PLA, camada 0.12 e quantidade 3 pré-selecionados', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'PLA' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: '0.12' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('#configurador')).toContainText('3')
  })

  test('calcula a estimativa em formato brasileiro', async ({ page }) => {
    const panel = page.locator('#configurador')
    // PLA (x1) x camada 0.12 (x1) x 3 unidades x R$58 = R$174,00
    await expect(panel).toContainText('R$ 174,00')
    await expect(panel).toContainText('R$ 156,60 no Pix')
    await expect(panel).toContainText('10x de R$ 17,40')
  })

  test('recalcula o preço ao trocar material e quantidade', async ({ page }) => {
    const panel = page.locator('#configurador')

    await page.getByRole('button', { name: 'PETG' }).click()
    // PETG (x1.25) x 3 x R$58 = R$217,50
    await expect(panel).toContainText('R$ 217,50')

    await page.getByRole('button', { name: 'Aumentar' }).click()
    // 4 unidades = R$290,00
    await expect(panel).toContainText('R$ 290,00')
  })

  test('não deixa a quantidade cair abaixo de 1', async ({ page }) => {
    const decrease = page.getByRole('button', { name: 'Diminuir' })
    await decrease.click()
    await decrease.click()
    await decrease.click()
    await expect(page.locator('#configurador')).toContainText('1')
    // 1 unidade de PLA 0.12 = R$58,00
    await expect(page.locator('#configurador')).toContainText('R$ 58,00')
  })

  test('pede login ao confirmar sem estar autenticado', async ({ page }) => {
    await page.getByRole('button', { name: 'Solicitar orçamento' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Home — navegação', () => {
  // A nav horizontal só existe a partir de md; no mobile ela vive dentro do
  // hambúrguer, coberto pelo bloco "Home — mobile".
  test.use({ viewport: { width: 1280, height: 900 } })

  test('o link Catálogo rola para a seção da home sem sair da página', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Catálogo', exact: true }).click()

    await expect(page).toHaveURL(/\/#catalogo$/)
    await expect(page.getByRole('heading', { name: 'Peças prontas para encomendar' })).toBeInViewport()
  })

  test('o botão Ver catálogo completo abre a página de catálogo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Ver catálogo completo' }).click()

    await expect(page).toHaveURL(/\/catalogo$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Peças prontas para encomendar' })).toBeVisible()
  })

  test('/orcamento redireciona para a home já no configurador', async ({ page }) => {
    await page.goto('/orcamento')

    await expect(page).toHaveURL(/\/#orcamento$/)
    await expect(page.getByText('Configurador de orçamento')).toBeInViewport()
  })

  test('volta da página de catálogo para uma seção da home sem recarregar o app', async ({ page }) => {
    await page.goto('/catalogo')

    // marca o documento; um reload de página inteira apagaria a marca
    await page.evaluate(() => {
      ;(window as unknown as { __spa: boolean }).__spa = true
    })

    await page.getByRole('link', { name: 'Como funciona' }).click()

    await expect(page).toHaveURL(/\/#como$/)
    const stillSameDocument = await page.evaluate(
      () => (window as unknown as { __spa?: boolean }).__spa === true,
    )
    expect(stillSameDocument).toBe(true)
  })

  test('mostra os 3 destaques do catálogo na home', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('#catalogo article')
    await expect(cards).toHaveCount(3)
    await expect(cards.first()).toContainText('Braço articulado')
  })
})

test.describe('Home — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a navegação fica acessível pelo menu hambúrguer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Catálogo', exact: true })).toBeHidden()

    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(page.getByRole('link', { name: 'Catálogo', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Fechar menu' }).click()
    await expect(page.getByRole('link', { name: 'Catálogo', exact: true })).toBeHidden()
  })

  test('o configurador aparece abaixo do texto do hero', async ({ page }) => {
    await page.goto('/')

    const heading = await page.getByRole('heading', { level: 1 }).boundingBox()
    const card = await page.locator('#configurador').boundingBox()

    expect(heading).not.toBeNull()
    expect(card).not.toBeNull()
    expect(card!.y).toBeGreaterThan(heading!.y)
  })
})
