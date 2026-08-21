jest.mock('../src/repositorios/categoriasRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const categoriasRepositorio = require('../src/repositorios/categoriasRepositorio');

describe('DELETE /categorias/:id', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 409 quando a categoria tem produtos vinculados', async () => {
    categoriasRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Armações' });
    categoriasRepositorio.contarProdutosVinculados.mockResolvedValue(3);

    const resposta = await request(app).delete('/categorias/1');

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: expect.any(String) });
    expect(categoriasRepositorio.excluir).not.toHaveBeenCalled();
  });

  it('exclui normalmente quando não há produtos vinculados', async () => {
    categoriasRepositorio.buscarPorId.mockResolvedValue({ id: 2, nome: 'Acessórios' });
    categoriasRepositorio.contarProdutosVinculados.mockResolvedValue(0);
    categoriasRepositorio.excluir.mockResolvedValue();

    const resposta = await request(app).delete('/categorias/2');

    expect(resposta.status).toBe(204);
    expect(categoriasRepositorio.excluir).toHaveBeenCalledWith('2');
  });
});
