import { describe, it, expect } from 'vitest'
import { isHexColor, normalizeHex } from './color'

describe('normalizeHex', () => {
  it('aceita com ou sem # e devolve em maiúsculas', () => {
    expect(normalizeHex('#f5f5f0')).toBe('#F5F5F0')
    expect(normalizeHex('f5f5f0')).toBe('#F5F5F0')
    expect(normalizeHex('  #B5651D ')).toBe('#B5651D')
  })

  it('recusa formatos incompletos ou inválidos', () => {
    expect(normalizeHex('f5f5')).toBeNull()
    expect(normalizeHex('#fff')).toBeNull()
    expect(normalizeHex('#GGGGGG')).toBeNull()
  })
})

describe('isHexColor', () => {
  it('exige # e 6 dígitos', () => {
    expect(isHexColor('#1a1a1a')).toBe(true)
    expect(isHexColor('1a1a1a')).toBe(false)
  })
})
