const armazenamento = require('../src/servicos/armazenamentoImagemProduto');

const SUPABASE_ORIGINAL = process.env.SUPABASE_URL;
const BASE = 'https://projeto.supabase.co';

// PNG mínimo válido, com as dimensões escritas no cabeçalho.
function pngDe(largura, altura) {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(largura, 16);
  buffer.writeUInt32BE(altura, 20);
  return buffer;
}

function arquivoDe({ mimetype = 'image/jpeg', size = 100 * 1024, buffer = Buffer.alloc(10) } = {}) {
  return { mimetype, size, buffer };
}

describe('validação da imagem do produto', () => {
  it('recusa quando não vem arquivo', () => {
    expect(armazenamento.validarImagemProduto(null)).toMatch(/nenhum arquivo/);
  });

  it('aceita JPG, PNG e WEBP', () => {
    ['image/jpeg', 'image/png', 'image/webp'].forEach((tipo) => {
      expect(armazenamento.validarImagemProduto(arquivoDe({ mimetype: tipo }))).toBeNull();
    });
  });

  it('recusa formato fora da lista', () => {
    const erro = armazenamento.validarImagemProduto(arquivoDe({ mimetype: 'image/gif' }));
    expect(erro).toMatch(/formato não permitido/);
  });

  it('recusa arquivo que passou do limite, sinal de que o ajuste não aconteceu', () => {
    const grande = arquivoDe({ size: armazenamento.TAMANHO_MAXIMO_BYTES + 1 });
    expect(armazenamento.validarImagemProduto(grande)).toMatch(/maior que 1 MB/);
  });

  it('recusa imagem menor que o mínimo', () => {
    const pequena = arquivoDe({ mimetype: 'image/png', buffer: pngDe(80, 80) });
    expect(armazenamento.validarImagemProduto(pequena)).toMatch(/muito pequena \(80×80\)/);
  });

  it('aceita imagem no limite do mínimo', () => {
    const noLimite = arquivoDe({
      mimetype: 'image/png',
      buffer: pngDe(armazenamento.LADO_MINIMO, armazenamento.LADO_MINIMO),
    });
    expect(armazenamento.validarImagemProduto(noLimite)).toBeNull();
  });
});

describe('reconhecimento da imagem no armazenamento', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = BASE;
  });

  afterEach(() => {
    if (SUPABASE_ORIGINAL === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = SUPABASE_ORIGINAL;
  });

  it('reconhece o nome do arquivo numa imagem nossa', () => {
    const url = `${BASE}/storage/v1/object/public/produtos/produto-123-abc.jpg`;
    expect(armazenamento.nomeDoArquivoNaUrl(url)).toBe('produto-123-abc.jpg');
  });

  it('ignora endereço de terceiros, que não é nosso para apagar', () => {
    expect(armazenamento.nomeDoArquivoNaUrl('https://outrolugar.com/foto.jpg')).toBeNull();
  });

  it('ignora imagem de outro bucket do mesmo projeto', () => {
    const url = `${BASE}/storage/v1/object/public/logotipos/logotipo-1.png`;
    expect(armazenamento.nomeDoArquivoNaUrl(url)).toBeNull();
  });

  it('recusa nome com caminho, que sairia do bucket', () => {
    const url = `${BASE}/storage/v1/object/public/produtos/../logotipos/logotipo-1.png`;
    expect(armazenamento.nomeDoArquivoNaUrl(url)).toBeNull();
  });

  it('trata vazio e nulo sem quebrar', () => {
    expect(armazenamento.nomeDoArquivoNaUrl('')).toBeNull();
    expect(armazenamento.nomeDoArquivoNaUrl(null)).toBeNull();
  });
});

describe('remoção da imagem antiga', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = BASE;
    process.env.SUPABASE_KEY = 'chave';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (SUPABASE_ORIGINAL === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = SUPABASE_ORIGINAL;
    jest.restoreAllMocks();
  });

  it('não chama o armazenamento para endereço de terceiros', async () => {
    global.fetch = jest.fn();

    const removeu = await armazenamento.removerImagemProduto('https://outrolugar.com/foto.jpg');

    expect(removeu).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('apaga a imagem quando ela é nossa', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const removeu = await armazenamento.removerImagemProduto(
      `${BASE}/storage/v1/object/public/produtos/produto-1.jpg`,
    );

    expect(removeu).toBe(true);
    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toContain('/object/produtos/produto-1.jpg');
    expect(opcoes.method).toBe('DELETE');
  });

  it('falha na remoção não lança: a troca já foi feita e não pode ser desfeita', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('sem rede'));

    await expect(
      armazenamento.removerImagemProduto(`${BASE}/storage/v1/object/public/produtos/produto-1.jpg`),
    ).resolves.toBe(false);
  });

  it('resposta de erro do armazenamento também não lança', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(
      armazenamento.removerImagemProduto(`${BASE}/storage/v1/object/public/produtos/produto-1.jpg`),
    ).resolves.toBe(false);
  });
});

describe('mensagens de falha do armazenamento', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = BASE;
    process.env.SUPABASE_KEY = 'chave';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (SUPABASE_ORIGINAL === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = SUPABASE_ORIGINAL;
    jest.restoreAllMocks();
  });

  it('bucket ausente vira instrução de criar o bucket', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 404, text: async () => '{"message":"Bucket not found"}',
    });

    await expect(armazenamento.enviarImagemProduto(arquivoDe()))
      .rejects.toThrow(/Crie o bucket/);
  });

  it('chave recusada aponta a variável certa', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 403, text: async () => '{"error":"Unauthorized"}',
    });

    await expect(armazenamento.enviarImagemProduto(arquivoDe()))
      .rejects.toThrow(/SUPABASE_KEY/);
  });

  it('a falha vem marcada, para a rota poder responder sem ser erro interno', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 404, text: async () => 'Bucket not found',
    });

    await expect(armazenamento.enviarImagemProduto(arquivoDe()))
      .rejects.toMatchObject({ deArmazenamento: true });
  });

  it('envio aceito devolve o endereço público', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const url = await armazenamento.enviarImagemProduto(arquivoDe());

    expect(url).toContain(`${BASE}/storage/v1/object/public/produtos/produto-`);
    expect(url).toMatch(/\.jpg$/);
  });

  it('cada envio gera um nome diferente, para não sobrescrever outra imagem', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const nomes = new Set();
    for (let i = 0; i < 20; i += 1) {
      nomes.add(await armazenamento.enviarImagemProduto(arquivoDe()));
    }
    expect(nomes.size).toBe(20);
  });
});
