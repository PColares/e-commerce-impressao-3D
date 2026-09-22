import { describe, it, expect } from 'vitest';
import { looksLikeModel } from './model-format.js';

// STL binário: cabeçalho de 80 bytes + uint32 com o nº de triângulos + 50 bytes por triângulo.
function binaryStl(triangles: number, header = 'modelo exportado') {
  const buffer = Buffer.alloc(84 + triangles * 50);
  buffer.write(header, 0, 'ascii');
  buffer.writeUInt32LE(triangles, 80);
  return buffer;
}

describe('looksLikeModel', () => {
  it('aceita STL binário cujo tamanho bate com o nº de triângulos', () => {
    const stl = binaryStl(3);
    expect(looksLikeModel('.stl', stl, stl.length)).toBe(true);
  });

  it('aceita STL binário mesmo quando o cabeçalho começa com "solid" (alguns exportadores fazem isso)', () => {
    const stl = binaryStl(2, 'solid exportado pelo cad');
    expect(looksLikeModel('.stl', stl, stl.length)).toBe(true);
  });

  it('aceita STL em texto', () => {
    const stl = Buffer.from('solid cubo\n  facet normal 0 0 1\n    outer loop\n');
    expect(looksLikeModel('.stl', stl, stl.length)).toBe(true);
  });

  it('recusa um arquivo qualquer renomeado para .stl', () => {
    const fake = Buffer.from('%PDF-1.7 isto é um pdf');
    expect(looksLikeModel('.stl', fake, 5_000)).toBe(false);
  });

  it('3MF é um zip', () => {
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    expect(looksLikeModel('.3mf', zip, 10_000)).toBe(true);
    expect(looksLikeModel('.3mf', Buffer.from('nao sou zip'), 11)).toBe(false);
  });

  it('OBJ é texto com vértices', () => {
    expect(looksLikeModel('.obj', Buffer.from('# Blender\no Cubo\nv 1.0 1.0 -1.0\nv 1.0 -1.0 -1.0\n'), 60)).toBe(true);
    expect(looksLikeModel('.obj', Buffer.from([0x00, 0x01, 0x02, 0x76, 0x20]), 5)).toBe(false);
  });

  it('STEP começa com ISO-10303-21', () => {
    expect(looksLikeModel('.step', Buffer.from('ISO-10303-21;\nHEADER;\n'), 30)).toBe(true);
    expect(looksLikeModel('.step', Buffer.from('HEADER;'), 7)).toBe(false);
  });

  it('extensão fora da lista nunca passa', () => {
    expect(looksLikeModel('.exe', Buffer.from('MZ'), 2)).toBe(false);
  });
});
