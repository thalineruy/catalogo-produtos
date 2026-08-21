// Lê a largura e a altura direto dos bytes do arquivo, sem depender de
// biblioteca externa. Só PNG e JPG têm dimensão fixa: SVG é vetorial e
// escala sem perder qualidade, por isso não entra nessa checagem.

function lerDimensaoPng(buffer) {
  // Assinatura PNG + primeiro bloco IHDR, com largura/altura em 16 e 20
  const assinatura = buffer.subarray(0, 8).toString('hex');
  if (assinatura !== '89504e470d0a1a0a' || buffer.length < 24) return null;
  return { largura: buffer.readUInt32BE(16), altura: buffer.readUInt32BE(20) };
}

function lerDimensaoJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let posicao = 2;
  while (posicao + 9 < buffer.length) {
    if (buffer[posicao] !== 0xff) {
      posicao += 1;
      continue;
    }

    const marcador = buffer[posicao + 1];
    // Blocos SOF (start of frame) trazem as dimensões. SOF4, SOF8 e SOF12
    // não são de imagem, por isso ficam de fora.
    const ehSof = marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);

    if (ehSof) {
      return { altura: buffer.readUInt16BE(posicao + 5), largura: buffer.readUInt16BE(posicao + 7) };
    }

    const tamanhoBloco = buffer.readUInt16BE(posicao + 2);
    if (tamanhoBloco < 2) return null;
    posicao += 2 + tamanhoBloco;
  }

  return null;
}

function lerDimensao(arquivo) {
  if (!arquivo || !arquivo.buffer) return null;
  if (arquivo.mimetype === 'image/png') return lerDimensaoPng(arquivo.buffer);
  if (arquivo.mimetype === 'image/jpeg') return lerDimensaoJpeg(arquivo.buffer);
  return null;
}

module.exports = { lerDimensao, lerDimensaoPng, lerDimensaoJpeg };
