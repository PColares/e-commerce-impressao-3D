import { describe, it, expect } from 'vitest';
import { slugify } from './slugify.js';

describe('slugify', () => {
  it('remove acentos e troca espaços por hífen', () => {
    expect(slugify('Braço articulado')).toBe('braco-articulado');
  });

  it('descarta pontuação e junta separadores repetidos', () => {
    expect(slugify('  Suporte de relógio — v2!  ')).toBe('suporte-de-relogio-v2');
  });

  it('deixa tudo em minúsculas', () => {
    expect(slugify('Vaso PETG Grande')).toBe('vaso-petg-grande');
  });
});
