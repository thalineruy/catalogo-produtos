jest.mock('../src/repositorios/estatisticasRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const estatisticasRepositorio = require('../src/repositorios/estatisticasRepositorio');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 9, nivel: 'operador' })}`;
const tokenAdministrador = `Bearer ${gerarToken({ id: 1, nivel: 'administrador' })}`;

describe('GET /estatisticas', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app).get('/estatisticas').set('Authorization', tokenOperador);
    expect(resposta.status).toBe(403);
  });

  it('responde 401 sem token', async () => {
    const resposta = await request(app).get('/estatisticas');
    expect(resposta.status).toBe(401);
  });

  it('os totais conferem com os dados devolvidos pelo repositório', async () => {
    estatisticasRepositorio.buscarProdutos.mockResolvedValue([
      { id: 1, quantidade: 10, estoque_minimo: 5, status: 'ativo', categoria_id: 1 },
      { id: 2, quantidade: 0, estoque_minimo: 5, status: 'ativo', categoria_id: 1 },
    ]);
    estatisticasRepositorio.buscarCategorias.mockResolvedValue([{ id: 1, nome: 'Armações' }]);
    estatisticasRepositorio.buscarSaidas.mockResolvedValue([
      { id: 1, quantidade: 3, data_saida: new Date().toISOString(), categoria_id: 1 },
    ]);

    const resposta = await request(app).get('/estatisticas').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(200);
    expect(resposta.body.totalProdutos).toBe(2);
    expect(resposta.body.produtosZerados).toBe(1);
    expect(resposta.body.totalSaidas).toBe(1);
    expect(resposta.body.unidadesSaidas).toBe(3);
    expect(resposta.body.numeroCategorias).toBe(1);
    expect(resposta.body.saidasPorMes).toHaveLength(6);
  });
});
