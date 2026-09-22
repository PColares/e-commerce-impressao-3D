import { describe, it, expect } from 'vitest'
import { dateInputValue, dueDateFromInput, duration, shortDate } from './production'

describe('duration', () => {
  it('mostra horas e minutos de forma curta', () => {
    expect(duration(45)).toBe('45min')
    expect(duration(60)).toBe('1h')
    expect(duration(150)).toBe('2h 30min')
    expect(duration(0)).toBe('0min')
  })
})

describe('shortDate', () => {
  it('dia/mês em pt-BR, no fuso de Belém', () => {
    // 02:00 UTC do dia 30 ainda é dia 29 em Belém (UTC-3).
    expect(shortDate('2026-09-30T02:00:00.000Z')).toBe('29/09')
    expect(shortDate('2026-09-30T15:00:00.000Z')).toBe('30/09')
  })
})

describe('dateInputValue', () => {
  it('converte a data salva para o valor do <input type="date">', () => {
    expect(dateInputValue('2026-09-30T15:00:00.000Z')).toBe('2026-09-30')
    expect(dateInputValue(null)).toBe('')
  })
})

describe('dueDateFromInput', () => {
  it('o prazo vale até o fim do dia escolhido em Belém', () => {
    const due = dueDateFromInput('2026-09-30')!
    expect(shortDate(due)).toBe('30/09')
    expect(dateInputValue(due)).toBe('2026-09-30')
    expect(due).toBe('2026-09-30T23:59:59-03:00')
  })

  it('campo vazio remove o prazo', () => {
    expect(dueDateFromInput('')).toBeNull()
  })
})
