jest.mock('../src/repositorios/saidasRepositorio');
jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const saidasRepositorio = require('../src/repositorios/saidasRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 7, nome: 'Operador Real', nivel: 'operador' })}`;

describe('POST /saidas', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('usa o operador do token, ignorando qualquer usuario_id enviado no corpo', async () => {
    saidasRepositorio.registrarSaida.mockResolvedValue({
      tipo: 'sucesso',
      saida: { id: 1, produto_id: 1, usuario_id: 7, quantidade: 2, motivo: 'venda em loja', estoque_restante: 8 },
    });

    const resposta = await request(app).post('/saidas').set('Authorization', tokenOperador).send({
      produto_id: 1,
      quantidade: 2,
      motivo: 'venda em loja',
      usuario_id: 999,
    });

    expect(resposta.status).toBe(201);
    expect(saidasRepositorio.registrarSaida).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 7 }),
    );
  });

  it('responde 409 quando o estoque é insuficiente', async () => {
    saidasRepositorio.registrarSaida.mockResolvedValue({ tipo: 'estoque_insuficiente', disponivel: 3 });

    const resposta = await request(app).post('/saidas').set('Authorization', tokenOperador).send({
      produto_id: 1,
      quantidade: 10,
      motivo: 'venda em loja',
    });

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toContain('3');
  });

  it('responde 400 para quantidade zero ou negativa', async () => {
    const resposta = await request(app).post('/saidas').set('Authorization', tokenOperador).send({
      produto_id: 1,
      quantidade: 0,
      motivo: 'venda em loja',
    });

    expect(resposta.status).toBe(400);
    expect(saidasRepositorio.registrarSaida).not.toHaveBeenCalled();
  });

  it('responde 400 para motivo fora da lista permitida', async () => {
    const resposta = await request(app).post('/saidas').set('Authorization', tokenOperador).send({
      produto_id: 1,
      quantidade: 1,
      motivo: 'motivo qualquer',
    });

    expect(resposta.status).toBe(400);
    expect(saidasRepositorio.registrarSaida).not.toHaveBeenCalled();
  });

  it('responde 401 sem token de acesso', async () => {
    const resposta = await request(app).post('/saidas').send({
      produto_id: 1,
      quantidade: 1,
      motivo: 'venda em loja',
    });

    expect(resposta.status).toBe(401);
    expect(saidasRepositorio.registrarSaida).not.toHaveBeenCalled();
  });
});
