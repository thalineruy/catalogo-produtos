jest.mock('../src/repositorios/produtosRepositorio');
jest.mock('../src/repositorios/categoriasRepositorio');
jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const produtosRepositorio = require('../src/repositorios/produtosRepositorio');
const categoriasRepositorio = require('../src/repositorios/categoriasRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 9, nivel: 'operador' })}`;

describe('POST /produtos', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 409 quando o código interno já existe', async () => {
    categoriasRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armações' });
    produtosRepositorio.buscarPorCodigo.mockResolvedValue({ id: 5 });

    const resposta = await request(app).post('/produtos').set('Authorization', tokenOperador).send({
      nome: 'Armação Teste',
      codigo_interno: 'OT-001',
      categoria_id: 1,
      quantidade: 5,
      estoque_minimo: 2,
    });

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: expect.any(String) });
    expect(produtosRepositorio.criar).not.toHaveBeenCalled();
  });

  it('cadastra normalmente quando o código interno é inédito', async () => {
    categoriasRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armações' });
    produtosRepositorio.buscarPorCodigo.mockResolvedValue(null);
    produtosRepositorio.criar.mockResolvedValue({ id: 10, nome: 'Armação Teste', codigo_interno: 'OT-999' });

    const resposta = await request(app).post('/produtos').set('Authorization', tokenOperador).send({
      nome: 'Armação Teste',
      codigo_interno: 'OT-999',
      categoria_id: 1,
      quantidade: 5,
      estoque_minimo: 2,
    });

    expect(resposta.status).toBe(201);
    expect(produtosRepositorio.criar).toHaveBeenCalledTimes(1);
  });

  it('responde 401 quando não há token de acesso', async () => {
    const resposta = await request(app).post('/produtos').send({
      nome: 'Armação Teste',
      codigo_interno: 'OT-999',
      categoria_id: 1,
    });

    expect(resposta.status).toBe(401);
    expect(produtosRepositorio.criar).not.toHaveBeenCalled();
  });
});

// Regra de negócio: quem digita certo recebe só o que casa exatamente; a
// busca por semelhança é uma segunda tentativa, quando a primeira falha.
describe('GET /produtos com busca sem resultado', () => {
  beforeEach(() => {
    produtosRepositorio.listar.mockReset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('achando na busca exata, não tenta a tolerante', async () => {
    produtosRepositorio.listar.mockResolvedValue([{ id: 1, nome: 'Armação', total_geral: '1' }]);

    const resposta = await request(app).get('/produtos?busca=armacao');

    expect(produtosRepositorio.listar).toHaveBeenCalledTimes(1);
    expect(produtosRepositorio.listar.mock.calls[0][0].tolerante).toBeFalsy();
    expect(resposta.body.aproximada).toBeUndefined();
  });

  it('sem achar nada, tenta de novo por semelhança', async () => {
    produtosRepositorio.listar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, nome: 'Armação', total_geral: '1' }]);

    const resposta = await request(app).get('/produtos?busca=armasao');

    expect(produtosRepositorio.listar).toHaveBeenCalledTimes(2);
    expect(produtosRepositorio.listar.mock.calls[1][0].tolerante).toBe(true);
    expect(resposta.body.itens).toHaveLength(1);
  });

  it('marca a resposta como aproximada, para a tela poder avisar', async () => {
    produtosRepositorio.listar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, nome: 'Armação', total_geral: '1' }]);

    const resposta = await request(app).get('/produtos?busca=armasao');

    expect(resposta.body.aproximada).toBe(true);
  });

  it('se nem a semelhança achar, responde vazio sem marcar', async () => {
    produtosRepositorio.listar.mockResolvedValue([]);

    const resposta = await request(app).get('/produtos?busca=xyzabc');

    expect(produtosRepositorio.listar).toHaveBeenCalledTimes(2);
    expect(resposta.body.itens).toHaveLength(0);
    expect(resposta.body.aproximada).toBeUndefined();
  });

  it('lista vazia sem termo de busca não aciona a tolerante', async () => {
    produtosRepositorio.listar.mockResolvedValue([]);

    await request(app).get('/produtos?categoria=Armações');

    expect(produtosRepositorio.listar).toHaveBeenCalledTimes(1);
  });

  it('busca só com espaços não aciona a tolerante', async () => {
    produtosRepositorio.listar.mockResolvedValue([]);

    await request(app).get('/produtos?busca=%20%20');

    expect(produtosRepositorio.listar).toHaveBeenCalledTimes(1);
  });

  it('a segunda tentativa mantém os demais filtros', async () => {
    produtosRepositorio.listar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, nome: 'Armação', total_geral: '1' }]);

    await request(app).get('/produtos?busca=armasao&status=ativo&categoria=Armações');

    const segunda = produtosRepositorio.listar.mock.calls[1][0];
    expect(segunda.status).toBe('ativo');
    expect(segunda.categoria).toBe('Armações');
  });
});

// Trocar a imagem apaga a anterior, para não acumular arquivo que ninguém vê.
jest.mock('../src/servicos/armazenamentoImagemProduto');
const armazenamentoImagem = require('../src/servicos/armazenamentoImagemProduto');

describe('imagem do produto', () => {
  const tokenAdmin = `Bearer ${gerarToken({ id: 1, nivel: 'administrador' })}`;
  const NOSSA = 'https://projeto.supabase.co/storage/v1/object/public/produtos/antiga.jpg';

  beforeEach(() => {
    armazenamentoImagem.removerImagemProduto.mockResolvedValue(true);
    armazenamentoImagem.validarImagemProduto.mockReturnValue(null);
    armazenamentoImagem.enviarImagemProduto.mockResolvedValue(`${NOSSA}?nova`);
    categoriasRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armações' });
    produtosRepositorio.buscarPorCodigo.mockResolvedValue(null);
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const corpo = {
    nome: 'Armação', codigo_interno: 'OT-1', categoria_id: 1,
    quantidade: 1, estoque_minimo: 1, status: 'ativo',
  };

  it('trocar a imagem apaga a anterior', async () => {
    produtosRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armação', url_imagem: NOSSA });
    produtosRepositorio.atualizar.mockResolvedValue({ id: 1, url_imagem: 'https://nova.jpg' });

    await request(app).put('/produtos/1').set('Authorization', tokenAdmin)
      .send({ ...corpo, url_imagem: 'https://nova.jpg' });

    expect(armazenamentoImagem.removerImagemProduto).toHaveBeenCalledWith(NOSSA);
  });

  it('salvar sem trocar a imagem não apaga nada', async () => {
    produtosRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armação', url_imagem: NOSSA });
    produtosRepositorio.atualizar.mockResolvedValue({ id: 1, url_imagem: NOSSA });

    await request(app).put('/produtos/1').set('Authorization', tokenAdmin)
      .send({ ...corpo, url_imagem: NOSSA });

    expect(armazenamentoImagem.removerImagemProduto).not.toHaveBeenCalled();
  });

  it('produto sem imagem anterior não tenta apagar', async () => {
    produtosRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armação', url_imagem: null });
    produtosRepositorio.atualizar.mockResolvedValue({ id: 1, url_imagem: 'https://nova.jpg' });

    await request(app).put('/produtos/1').set('Authorization', tokenAdmin)
      .send({ ...corpo, url_imagem: 'https://nova.jpg' });

    expect(armazenamentoImagem.removerImagemProduto).not.toHaveBeenCalled();
  });

  it('excluir o produto leva a imagem junto', async () => {
    produtosRepositorio.buscarPorId.mockResolvedValue({
      id: 1, nome: 'Armação', codigo_interno: 'OT-1', url_imagem: NOSSA,
    });
    produtosRepositorio.excluir.mockResolvedValue();

    await request(app).delete('/produtos/1').set('Authorization', tokenAdmin);

    expect(armazenamentoImagem.removerImagemProduto).toHaveBeenCalledWith(NOSSA);
  });

  it('o envio exige autenticação', async () => {
    const resposta = await request(app).post('/produtos/imagem');

    expect(resposta.status).toBe(401);
    expect(armazenamentoImagem.enviarImagemProduto).not.toHaveBeenCalled();
  });

  it('arquivo recusado na validação não vai para o armazenamento', async () => {
    armazenamentoImagem.validarImagemProduto.mockReturnValue('formato não permitido');

    const resposta = await request(app).post('/produtos/imagem')
      .set('Authorization', tokenAdmin)
      .attach('imagem', Buffer.from('nao e imagem'), 'arquivo.txt');

    expect(resposta.status).toBe(400);
    expect(armazenamentoImagem.enviarImagemProduto).not.toHaveBeenCalled();
  });

  it('envio aceito devolve o endereço público', async () => {
    const resposta = await request(app).post('/produtos/imagem')
      .set('Authorization', tokenAdmin)
      .attach('imagem', Buffer.from('conteudo'), 'foto.jpg');

    expect(resposta.status).toBe(201);
    expect(resposta.body.url).toContain('produtos/');
  });
});
