const { lerDimensao } = require('../src/servicos/dimensaoImagem');
const { validarArquivoLogotipo } = require('../src/servicos/armazenamentoLogotipo');

function montarPng(largura, altura) {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(largura, 16);
  buffer.writeUInt32BE(altura, 20);
  return buffer;
}

function montarJpeg(largura, altura) {
  // SOI + bloco SOF0 com as dimensões
  const partes = [
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]),
    (() => {
      const b = Buffer.alloc(4);
      b.writeUInt16BE(altura, 0);
      b.writeUInt16BE(largura, 2);
      return b;
    })(),
    Buffer.alloc(8),
  ];
  return Buffer.concat(partes);
}

describe('lerDimensao', () => {
  it('lê a dimensão de um PNG', () => {
    expect(lerDimensao({ mimetype: 'image/png', buffer: montarPng(300, 240) })).toEqual({
      largura: 300,
      altura: 240,
    });
  });

  it('lê a dimensão de um JPEG', () => {
    expect(lerDimensao({ mimetype: 'image/jpeg', buffer: montarJpeg(640, 480) })).toEqual({
      largura: 640,
      altura: 480,
    });
  });

  it('devolve null para SVG, que é vetorial e não tem lado fixo', () => {
    expect(lerDimensao({ mimetype: 'image/svg+xml', buffer: Buffer.from('<svg/>') })).toBeNull();
  });

  it('devolve null quando os bytes não são de um PNG válido', () => {
    expect(lerDimensao({ mimetype: 'image/png', buffer: Buffer.alloc(24) })).toBeNull();
  });
});

describe('validarArquivoLogotipo com dimensão', () => {
  it('recusa PNG menor que 240×240', () => {
    const erro = validarArquivoLogotipo({
      mimetype: 'image/png',
      size: 1000,
      buffer: montarPng(100, 100),
    });

    expect(erro).toMatch(/240/);
  });

  it('aceita PNG de exatamente 240×240', () => {
    const erro = validarArquivoLogotipo({
      mimetype: 'image/png',
      size: 1000,
      buffer: montarPng(240, 240),
    });

    expect(erro).toBeNull();
  });

  it('recusa quando só um dos lados é menor que o mínimo', () => {
    const erro = validarArquivoLogotipo({
      mimetype: 'image/png',
      size: 1000,
      buffer: montarPng(500, 120),
    });

    expect(erro).toMatch(/240/);
  });

  it('aceita SVG sem checar dimensão', () => {
    const erro = validarArquivoLogotipo({
      mimetype: 'image/svg+xml',
      size: 1000,
      buffer: Buffer.from('<svg width="10" height="10"/>'),
    });

    expect(erro).toBeNull();
  });
});
