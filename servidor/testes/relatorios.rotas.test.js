jest.mock('../src/repositorios/relatoriosRepositorio');
jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const relatoriosRepositorio = require('../src/repositorios/relatoriosRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 3, nome: 'Beatriz Alves', nivel: 'operador' })}`;

const saidasFicticias = [
  {
    id: 1,
    produto_nome: 'Armação Acetato Preta',
    codigo_interno: 'OT-001',
    categoria_nome: 'Armações',
    estoque_atual: 25,
    estoque_minimo: 5,
    produto_status: 'ativo',
    usuario_id: 3,
    operador_nome: 'Beatriz Alves',
    quantidade: 2,
    motivo: 'venda em loja',
    data_saida: '2026-08-01T10:00:00.000Z',
  },
];

describe('GET /relatorios/saidas', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
    relatoriosRepositorio.buscarSaidasParaRelatorio.mockResolvedValue(saidasFicticias);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 400 quando nenhum campo é escolhido', async () => {
    const resposta = await request(app).get('/relatorios/saidas').set('Authorization', tokenOperador);

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: expect.any(String) });
    expect(logsRepositorio.registrar).not.toHaveBeenCalled();
  });

  it('responde 401 sem token de acesso', async () => {
    const resposta = await request(app).get('/relatorios/saidas?campos=nome');
    expect(resposta.status).toBe(401);
  });

  it('emitir relatório grava log do tipo Relatório', async () => {
    const resposta = await request(app)
      .get('/relatorios/saidas?campos=nome,categoria')
      .set('Authorization', tokenOperador);

    expect(resposta.status).toBe(200);
    expect(logsRepositorio.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 3, tipo: 'Relatório' }),
    );
  });
});
