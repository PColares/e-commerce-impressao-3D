import { test, expect, type Download } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { binaryStl, login, openPanelAsAdmin, registerUser, uniqueEmail } from './helpers'

test.skip(!!process.env.E2E_BASE_URL, 'usa o admin promovido no banco local')

async function downloadedBytes(download: Download) {
  return readFileSync(await download.path())
}

test.describe('Upload do modelo 3D', () => {
  test('cliente envia o STL no configurador e o admin baixa o mesmo arquivo', async ({ page, request }) => {
    const email = uniqueEmail('cliente')
    await registerUser(request, email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')

    const fileName = `Suporte Peça ${Date.now()}.stl`
    const stl = binaryStl(40)
    await page.getByLabel('Arquivo do modelo 3D').setInputFiles({ name: fileName, mimeType: 'model/stl', buffer: stl })
    await expect(page.locator('#configurador')).toContainText(fileName)
    await page.getByRole('button', { name: 'Solicitar orçamento' }).click()
    await expect(page.getByText('Orçamento criado com sucesso.')).toBeVisible()

    // O admin baixa do painel exatamente o que o cliente enviou.
    await openPanelAsAdmin(page, request)
    await page.getByRole('tab', { name: 'Orçamentos' }).click()
    const row = page.getByRole('row').filter({ hasText: fileName })
    const [fromQuotes] = await Promise.all([
      page.waitForEvent('download'),
      row.getByRole('button', { name: 'Baixar arquivo' }).click(),
    ])
    expect(fromQuotes.suggestedFilename()).toBe(fileName)
    expect((await downloadedBytes(fromQuotes)).equals(stl)).toBe(true)

    // E também direto do card na produção, na hora de fatiar.
    await row.getByRole('button', { name: 'Aprovar' }).click()
    await row.getByRole('button', { name: 'Mandar para produção' }).click()
    await page.getByRole('dialog', { name: 'Mandar para produção' }).getByRole('button', { name: 'Criar job' }).click()
    await page.getByRole('tab', { name: 'Produção' }).click()
    const card = page.getByRole('article').filter({ hasText: fileName })
    const [fromJob] = await Promise.all([
      page.waitForEvent('download'),
      card.getByRole('button', { name: 'Baixar arquivo' }).click(),
    ])
    expect((await downloadedBytes(fromJob)).equals(stl)).toBe(true)
  })

  test('arquivo que não é modelo 3D é recusado com explicação', async ({ page, request }) => {
    const email = uniqueEmail('cliente')
    await registerUser(request, email)
    await login(page, email)
    await page.waitForURL((url) => url.pathname === '/')

    await page.getByLabel('Arquivo do modelo 3D').setInputFiles({
      name: 'nao-e-stl.stl',
      mimeType: 'model/stl',
      buffer: Buffer.from('%PDF-1.7 isto é um pdf renomeado'),
    })
    await page.getByRole('button', { name: 'Solicitar orçamento' }).click()

    await expect(page.getByText('O conteúdo não parece um arquivo STL')).toBeVisible()
    await expect(page.getByText('Orçamento criado com sucesso.')).toHaveCount(0)
  })
})
