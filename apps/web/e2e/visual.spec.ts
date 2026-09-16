import { test, expect, type Page } from '@playwright/test'

// Baselines de screenshot dependem da renderização de fonte do SO. Os arquivos
// commitados foram gerados no Windows; para rodar em CI Linux, regenere dentro
// da imagem oficial do Playwright ou rode este arquivo só no ambiente de origem.

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
}

test.describe('Regressão visual', () => {
  test('home completa', async ({ page }) => {
    await page.goto('/')
    await settle(page)
    await expect(page).toHaveScreenshot('home.png', { fullPage: true, animations: 'disabled' })
  })

  test('card do configurador', async ({ page }) => {
    await page.goto('/')
    await settle(page)
    await expect(page.locator('#configurador')).toHaveScreenshot('configurador.png', {
      animations: 'disabled',
    })
  })

  test('catálogo completo', async ({ page }) => {
    await page.goto('/catalogo')
    await settle(page)
    await expect(page).toHaveScreenshot('catalogo.png', { fullPage: true, animations: 'disabled' })
  })

  test('login', async ({ page }) => {
    await page.goto('/login')
    await settle(page)
    await expect(page).toHaveScreenshot('login.png', { fullPage: true, animations: 'disabled' })
  })
})
