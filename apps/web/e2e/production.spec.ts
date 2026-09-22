import { test, expect, type Page } from '@playwright/test'
import { createQuoteAsCustomer, openPanelAsAdmin } from './helpers'

test.skip(!!process.env.E2E_BASE_URL, 'usa o admin promovido no banco local')

// Impressoras "E2E ..." e os pedidos dos clientes @e2e.com são apagados pelo
// globalTeardown (apps/api/prisma/e2e-cleanup.ts).
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function column(page: Page, name: string) {
  return page.getByRole('region', { name })
}

function card(page: Page, title: string) {
  return page.getByRole('article').filter({ hasText: title })
}

async function createPrinter(page: Page, name: string) {
  await page.getByRole('tab', { name: 'Impressoras' }).click()
  await page.getByRole('button', { name: 'Nova impressora' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova impressora' })
  await dialog.getByLabel('Nome').fill(name)
  await dialog.getByLabel('Modelo').fill('Creality K2 Plus')
  await dialog.getByRole('button', { name: 'Salvar impressora' }).click()
  await expect(dialog).toBeHidden()
  await expect(card(page, name)).toContainText('Disponível')
}

test.describe('Produção', () => {
  test('do orçamento ao pronto, passando por uma falha de impressão', async ({ page, request }) => {
    const fileName = `peca-${unique()}.stl`
    const printerName = `E2E K2 ${unique()}`
    await createQuoteAsCustomer(request, fileName)
    await openPanelAsAdmin(page, request)

    await createPrinter(page, printerName)

    // Aprovar o orçamento cria o pedido; daí ele vai para a produção.
    await page.getByRole('tab', { name: 'Orçamentos' }).click()
    const quoteRow = page.getByRole('row').filter({ hasText: fileName })
    await quoteRow.getByRole('button', { name: 'Aprovar' }).click()
    await expect(quoteRow).toContainText('Aprovado')
    await expect(quoteRow).toContainText('Aguardando pagamento')
    await quoteRow.getByRole('button', { name: 'Mandar para produção' }).click()
    const jobDialog = page.getByRole('dialog', { name: 'Mandar para produção' })
    await expect(jobDialog.getByLabel('Título')).toHaveValue(fileName)
    await jobDialog.getByLabel('Prazo').fill('2020-01-01')
    await jobDialog.getByRole('button', { name: 'Criar job' }).click()
    await expect(jobDialog).toBeHidden()
    await expect(quoteRow).toContainText('Em produção')

    await page.getByRole('tab', { name: 'Produção' }).click()
    const job = card(page, fileName)
    await expect(column(page, 'Fila').getByRole('article').filter({ hasText: fileName })).toBeVisible()
    await expect(job).toContainText('Atrasado')
    await expect(job).toContainText('Aguardando pagamento')

    // Iniciar na impressora: o job vai para "Imprimindo" e a impressora fica ocupada.
    await job.getByRole('button', { name: 'Iniciar' }).click()
    const startDialog = page.getByRole('dialog', { name: 'Iniciar impressão' })
    await startDialog.getByLabel('Impressora').selectOption({ label: printerName })
    await startDialog.getByRole('button', { name: 'Iniciar' }).click()
    await expect(column(page, 'Imprimindo').getByRole('article').filter({ hasText: fileName })).toBeVisible()
    await expect(job).toContainText(printerName)

    await page.getByRole('tab', { name: 'Impressoras' }).click()
    await expect(card(page, printerName)).toContainText('Imprimindo')
    await expect(card(page, printerName)).toContainText(fileName)

    // Falhou: registra o motivo, volta para a fila e libera a impressora.
    await page.getByRole('tab', { name: 'Produção' }).click()
    await job.getByRole('button', { name: 'Falhou' }).click()
    const failDialog = page.getByRole('dialog', { name: 'Registrar falha' })
    await failDialog.getByLabel('Motivo').selectOption({ label: 'Spaghetti (soltou da mesa)' })
    await failDialog.getByLabel('Filamento perdido (g)').fill('20')
    await failDialog.getByRole('button', { name: 'Registrar falha' }).click()
    await expect(column(page, 'Fila').getByRole('article').filter({ hasText: fileName })).toBeVisible()
    await expect(job).toContainText('1 falha')

    await page.getByRole('tab', { name: 'Impressoras' }).click()
    await expect(card(page, printerName)).toContainText('Disponível')

    // Reimpressão até o fim.
    await page.getByRole('tab', { name: 'Produção' }).click()
    await job.getByRole('button', { name: 'Iniciar' }).click()
    await startDialog.getByLabel('Impressora').selectOption({ label: printerName })
    await startDialog.getByRole('button', { name: 'Iniciar' }).click()
    await job.getByRole('button', { name: 'Terminar impressão' }).click()
    await expect(column(page, 'Acabamento').getByRole('article').filter({ hasText: fileName })).toBeVisible()
    await job.getByRole('button', { name: 'Conferência' }).click()
    await expect(column(page, 'Conferência').getByRole('article').filter({ hasText: fileName })).toBeVisible()
    await job.getByRole('button', { name: 'Pronto' }).click()
    await expect(column(page, 'Pronto').getByRole('article').filter({ hasText: fileName })).toBeVisible()
    await expect(job).not.toContainText('Atrasado')
  })

  test('recusar orçamento não cria pedido', async ({ page, request }) => {
    const fileName = `recusado-${unique()}.stl`
    await createQuoteAsCustomer(request, fileName)
    await openPanelAsAdmin(page, request)

    await page.getByRole('tab', { name: 'Orçamentos' }).click()
    const row = page.getByRole('row').filter({ hasText: fileName })
    await row.getByRole('button', { name: 'Recusar' }).click()

    await expect(row).toContainText('Recusado')
    // Some tudo que decide o orçamento; baixar o arquivo continua disponível.
    for (const action of ['Aprovar', 'Recusar', 'Mandar para produção']) {
      await expect(row.getByRole('button', { name: action })).toHaveCount(0)
    }
  })

  test('impressora em manutenção não aparece como opção para iniciar', async ({ page, request }) => {
    const printerName = `E2E K2 ${unique()}`
    const fileName = `peca-${unique()}.stl`
    await createQuoteAsCustomer(request, fileName)
    await openPanelAsAdmin(page, request)
    await createPrinter(page, printerName)

    await card(page, printerName).getByRole('button', { name: 'Editar' }).click()
    const dialog = page.getByRole('dialog', { name: 'Editar impressora' })
    await dialog.getByLabel('Status').selectOption({ label: 'Em manutenção' })
    await dialog.getByRole('button', { name: 'Salvar impressora' }).click()
    await expect(card(page, printerName)).toContainText('Em manutenção')

    await page.getByRole('tab', { name: 'Orçamentos' }).click()
    const row = page.getByRole('row').filter({ hasText: fileName })
    await row.getByRole('button', { name: 'Aprovar' }).click()
    await row.getByRole('button', { name: 'Mandar para produção' }).click()
    await page.getByRole('dialog', { name: 'Mandar para produção' }).getByRole('button', { name: 'Criar job' }).click()

    await page.getByRole('tab', { name: 'Produção' }).click()
    await card(page, fileName).getByRole('button', { name: 'Iniciar' }).click()
    const options = page.getByRole('dialog', { name: 'Iniciar impressão' }).getByLabel('Impressora').locator('option')
    await expect(options.filter({ hasText: printerName })).toHaveCount(0)
  })
})
