import { test, expect } from '@playwright/test'

test.describe('Catálogo completo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catalogo')
  })

  test('lista todas as peças com preço em reais', async ({ page }) => {
    const cards = page.locator('main article')
    await expect(cards).toHaveCount(3)
    await expect(page.getByText('R$ 89,00')).toBeVisible()
    await expect(page.getByText('R$ 142,00')).toBeVisible()
    await expect(page.getByText('R$ 118,00')).toBeVisible()
  })

  test('mostra ficha técnica e condições de pagamento no card', async ({ page }) => {
    const card = page.locator('main article').filter({ hasText: 'Braço articulado' })
    await expect(card).toContainText('PETG · 0.20mm')
    await expect(card).toContainText('12 cm · 48 g · preenchimento 20%')
    await expect(card).toContainText('Pix R$ 80,10')
    await expect(card).toContainText('10x R$ 8,90')
  })

  test('filtra por material', async ({ page }) => {
    await expect(page.locator('main article')).toHaveCount(3)

    await page.getByRole('button', { name: 'Resina' }).click()

    await expect(page.locator('main article')).toHaveCount(1)
    await expect(page.locator('main article')).toContainText('Suporte de relógio')
    await expect(page.getByText('1 peça')).toBeVisible()
  })

  test('volta a listar tudo ao escolher Todos', async ({ page }) => {
    await page.getByRole('button', { name: 'ABS' }).click()
    await expect(page.locator('main article')).toHaveCount(1)

    await page.getByRole('button', { name: 'Todos' }).click()
    await expect(page.locator('main article')).toHaveCount(3)
    await expect(page.getByText('3 peças')).toBeVisible()
  })

  test('ordena por menor e maior preço', async ({ page }) => {
    await page.getByLabel('Ordenar').selectOption('price-asc')
    await expect(page.locator('main article').first()).toContainText('Braço articulado')

    await page.getByLabel('Ordenar').selectOption('price-desc')
    await expect(page.locator('main article').first()).toContainText('Suporte de relógio')
  })

  test('mantém o filtro e a ordenação combinados', async ({ page }) => {
    await page.getByRole('button', { name: 'PETG' }).click()
    await page.getByLabel('Ordenar').selectOption('price-desc')

    await expect(page.locator('main article')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'PETG' })).toHaveAttribute('aria-pressed', 'true')
  })
})
