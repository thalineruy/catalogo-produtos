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
