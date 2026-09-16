import { describe, it, expect } from 'vitest'
import {
  calculateQuotePrice,
  quoteRequestSchema,
  QUOTE_BASE_PRICE,
  MAX_INSTALLMENTS,
  MAX_MODEL_FILE_SIZE_BYTES,
} from './quote.js'

describe('calculateQuotePrice', () => {
  it('multiplica preço base, material, camada e quantidade', () => {
    const price = calculateQuotePrice(1, 1, 1)
    expect(price.subtotal).toBe(QUOTE_BASE_PRICE)
  })

  it('reproduz a estimativa de referência do protótipo (PLA, 0.12mm, 3un)', () => {
    const price = calculateQuotePrice(1, 1, 3)
    expect(price.subtotal).toBe(174)
    expect(price.totalCard).toBe(174)
    expect(price.totalPix).toBe(156.6)
    expect(price.pixDiscount).toBe(17.4)
  })

  it('aplica o multiplicador do material', () => {
    // PETG ×1.25
    expect(calculateQuotePrice(1.25, 1, 1).subtotal).toBe(72.5)
    // Resina ×1.8
    expect(calculateQuotePrice(1.8, 1, 1).subtotal).toBe(104.4)
  })

  it('aplica o multiplicador da altura de camada', () => {
    // 0.20mm ×0.85 sai mais barato que a camada base
    expect(calculateQuotePrice(1, 0.85, 1).subtotal).toBe(49.3)
    // 0.08mm ×1.4 sai mais caro
    expect(calculateQuotePrice(1, 1.4, 1).subtotal).toBe(81.2)
  })

  it('combina material e camada de forma multiplicativa', () => {
    // Resina (1.8) em 0.08mm (1.4) x 2 unidades
    const price = calculateQuotePrice(1.8, 1.4, 2)
    expect(price.subtotal).toBe(292.32)
  })

  it('o desconto do Pix é exatamente 10% do subtotal', () => {
    const price = calculateQuotePrice(1.35, 1, 7)
    expect(price.pixDiscount).toBeCloseTo(price.subtotal * 0.1, 2)
    expect(price.totalPix).toBeCloseTo(price.subtotal - price.pixDiscount, 2)
  })

  it('não desconta o preço no cartão', () => {
    const price = calculateQuotePrice(1.25, 1.4, 5)
    expect(price.totalCard).toBe(price.subtotal)
    expect(price.installments).toBe(MAX_INSTALLMENTS)
  })

  it('arredonda os valores monetários em duas casas', () => {
    // 58 x 1.35 x 1.4 x 1 = 109.62 exatos; garante que não vaza dízima
    const price = calculateQuotePrice(1.35, 1.4, 1)
    expect(price.subtotal).toBe(109.62)
    expect(Number.isInteger(price.subtotal * 100)).toBe(true)
    expect(Number.isInteger(price.totalPix * 100)).toBe(true)
  })

  it('escala linearmente com a quantidade', () => {
    const one = calculateQuotePrice(1.25, 1.4, 1).subtotal
    const ten = calculateQuotePrice(1.25, 1.4, 10).subtotal
    expect(ten).toBeCloseTo(one * 10, 2)
  })

  it('devolve os fatores usados, para auditoria do orçamento', () => {
    const price = calculateQuotePrice(1.8, 0.85, 4)
    expect(price).toMatchObject({
      basePrice: QUOTE_BASE_PRICE,
      materialMultiplier: 1.8,
      layerHeightMultiplier: 0.85,
      quantity: 4,
    })
  })
})

describe('quoteRequestSchema', () => {
  const valid = {
    fileName: 'peca.stl',
    fileUrl: 'https://storage.example.com/peca.stl',
    material: 'PLA' as const,
    layerHeight: 0.12 as const,
    colorId: 'ckcolor123',
    quantity: 2,
  }

  it('aceita um pedido válido', () => {
    expect(quoteRequestSchema.safeParse(valid).success).toBe(true)
  })

  it('rejeita material desconhecido', () => {
    const result = quoteRequestSchema.safeParse({ ...valid, material: 'MADEIRA' })
    expect(result.success).toBe(false)
  })

  it('rejeita altura de camada fora das três suportadas', () => {
    expect(quoteRequestSchema.safeParse({ ...valid, layerHeight: 0.3 }).success).toBe(false)
  })

  it('rejeita quantidade zero, negativa ou fracionada', () => {
    expect(quoteRequestSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false)
    expect(quoteRequestSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false)
    expect(quoteRequestSchema.safeParse({ ...valid, quantity: 1.5 }).success).toBe(false)
  })

  it('rejeita quantidade acima do limite de 999', () => {
    expect(quoteRequestSchema.safeParse({ ...valid, quantity: 1000 }).success).toBe(false)
  })

  it('rejeita fileUrl que não é URL', () => {
    expect(quoteRequestSchema.safeParse({ ...valid, fileUrl: 'nao-e-url' }).success).toBe(false)
  })

  it('rejeita nome de arquivo vazio', () => {
    expect(quoteRequestSchema.safeParse({ ...valid, fileName: '' }).success).toBe(false)
  })
})

describe('limites de arquivo', () => {
  it('o teto de upload é 200MB', () => {
    expect(MAX_MODEL_FILE_SIZE_BYTES).toBe(200 * 1024 * 1024)
  })
})
