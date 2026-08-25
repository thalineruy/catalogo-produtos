const armazenamento = require('../src/servicos/armazenamentoLogotipo');

const SUPABASE_ORIGINAL = process.env.SUPABASE_URL;

// O logotipo recebeu o mesmo tratamento dado à imagem de produto: falha de
// armazenamento vira instrução do que configurar, e não "erro interno do
// servidor".
describe('falha ao guardar o logotipo', () => {
  const arquivo = { mimetype: 'image/png', size: 1000, buffer: Buffer.alloc(10) };

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://projeto.supabase.co';
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
      ok: false, status: 404, text: async () => 'Bucket not found',
    });

    await expect(armazenamento.enviarLogotipo(arquivo)).rejects.toThrow(/Crie o bucket/);
  });

  it('a instrução cita o bucket certo, que não é o das imagens de produto', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 404, text: async () => 'Bucket not found',
    });

    await expect(armazenamento.enviarLogotipo(arquivo)).rejects.toThrow(/logotipos/);
  });

  it('chave recusada aponta a variável certa', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 403, text: async () => 'Unauthorized',
    });

    await expect(armazenamento.enviarLogotipo(arquivo)).rejects.toThrow(/SUPABASE_KEY/);
  });

  it('a falha vem marcada, para a rota não responder erro interno', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 404, text: async () => 'Bucket not found',
    });

    await expect(armazenamento.enviarLogotipo(arquivo))
      .rejects.toMatchObject({ deArmazenamento: true });
  });

  it('envio aceito devolve o endereço público', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const url = await armazenamento.enviarLogotipo(arquivo);

    expect(url).toContain('/storage/v1/object/public/logotipos/logotipo-');
  });
});
