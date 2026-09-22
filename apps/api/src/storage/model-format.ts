// Confere se o começo do arquivo combina com a extensão declarada. Não valida
// a geometria (isso é trabalho do fatiador); só impede que qualquer arquivo
// renomeado para .stl entre no servidor.
//
// `head` são os primeiros bytes do arquivo (4KB bastam); `size` é o total.
export function looksLikeModel(extension: string, head: Buffer, size: number): boolean {
  switch (extension) {
    case '.stl':
      return isBinaryStl(head, size) || head.toString('ascii', 0, 64).trimStart().startsWith('solid');
    case '.3mf':
      // 3MF é um pacote zip.
      return head.length >= 4 && head.readUInt32LE(0) === 0x04034b50;
    case '.obj':
      return isText(head) && /^v\s/m.test(head.toString('utf8'));
    case '.step':
      return head.toString('ascii', 0, 64).trimStart().startsWith('ISO-10303-21');
    default:
      return false;
  }
}

// O tamanho de um STL binário é exato: 80 de cabeçalho + 4 do contador + 50 por
// triângulo. Checar isso primeiro importa porque vários exportadores escrevem
// "solid" no cabeçalho do formato binário.
function isBinaryStl(head: Buffer, size: number): boolean {
  if (head.length < 84) return false;
  const triangles = head.readUInt32LE(80);
  return triangles > 0 && size === 84 + triangles * 50;
}

function isText(head: Buffer): boolean {
  return !head.includes(0);
}
