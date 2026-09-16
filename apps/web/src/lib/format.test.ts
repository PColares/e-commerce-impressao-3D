import { describe, it, expect } from 'vitest'
import { brl, layerHeightLabel } from './format'

describe('brl', () => {
  it('formata no padrão brasileiro, com vírgula decimal', () => {
    expect(brl(174)).toBe('R$ 174,00')
    expect(brl(156.6)).toBe('R$ 156,60')
    expect(brl(17.4)).toBe('R$ 17,40')
  })

  it('usa ponto como separador de milhar', () => {
    expect(brl(1234.5)).toBe('R$ 1.234,50')
  })

  it('usa espaço comum, não espaço inquebrável, depois do R$', () => {
    // O Intl devolve U+00A0; se vazar, comparações de texto em teste quebram
    expect(brl(58)).not.toContain(' ')
    expect(brl(58)).toBe('R$ 58,00')
  })

  it('sempre mostra duas casas decimais', () => {
    expect(brl(58)).toBe('R$ 58,00')
    expect(brl(0)).toBe('R$ 0,00')
  })
})

describe('layerHeightLabel', () => {
  it('normaliza para duas casas decimais', () => {
    // a API devolve "0.2"; o design mostra "0.20"
    expect(layerHeightLabel('0.2')).toBe('0.20')
    expect(layerHeightLabel('0.12')).toBe('0.12')
    expect(layerHeightLabel('0.08')).toBe('0.08')
  })

  it('aceita number além de string', () => {
    expect(layerHeightLabel(0.2)).toBe('0.20')
  })
})
