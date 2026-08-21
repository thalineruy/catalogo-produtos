jest.mock('../src/repositorios/categoriasRepositorio');
jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const categoriasRepositorio = require('../src/repositorios/categoriasRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 9, nivel: 'operador' })}`;
const tokenAdministrador = `Bearer ${gerarToken({ id: 1, nivel: 'administrador' })}`;

describe('DELETE /categorias/:id', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 409 quando a categoria tem produtos vinculados', async () => {
    categoriasRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armações' });
    categoriasRepositorio.contarProdutosVinculados.mockResolvedValue(3);

    const resposta = await request(app).delete('/categorias/1').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: expect.any(String) });
    expect(categoriasRepositorio.excluir).not.toHaveBeenCalled();
  });

  it('exclui normalmente quando não há produtos vinculados', async () => {
    categoriasRepositorio.buscarPorId.mockResolvedValue({ id: 2, nome: 'Acessórios' });
    categoriasRepositorio.contarProdutosVinculados.mockResolvedValue(0);
    categoriasRepositorio.excluir.mockResolvedValue();

    const resposta = await request(app).delete('/categorias/2').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(204);
    expect(categoriasRepositorio.excluir).toHaveBeenCalledWith('2');
  });

  it('responde 401 quando não há token de acesso', async () => {
    const resposta = await request(app).delete('/categorias/2');

    expect(resposta.status).toBe(401);
    expect(categoriasRepositorio.excluir).not.toHaveBeenCalled();
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app).delete('/categorias/2').set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
    expect(categoriasRepositorio.excluir).not.toHaveBeenCalled();
  });
});

describe('POST /categorias', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app).post('/categorias').set('Authorization', tokenOperador).send({ nome: 'Nova' });

    expect(resposta.status).toBe(403);
    expect(categoriasRepositorio.criar).not.toHaveBeenCalled();
  });
});
