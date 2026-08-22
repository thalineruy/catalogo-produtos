jest.mock('../src/repositorios/convitesRepositorio');
jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const convitesRepositorio = require('../src/repositorios/convitesRepositorio');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { hashToken } = require('../src/servicos/convite');
const convitesRotas = require('../src/rotas/convites');

const TOKEN = 'token-de-teste';
const DAQUI_A_UM_DIA = new Date(Date.now() + 24 * 60 * 60 * 1000);
const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000);

function conviteValido(extras = {}) {
  return {
    id: 10,
    usuario_id: 3,
    expira_em: DAQUI_A_UM_DIA,
    usado_em: null,
    usuario_nome: 'Beatriz Alves',
    usuario_email: 'beatriz@exemplo.com',
    ...extras,
  };
}

describe('ativação por convite', () => {
  beforeEach(() => {
    convitesRotas.limitador.zerar();
    logsRepositorio.registrar.mockResolvedValue();
    usuariosRepositorio.atualizarSenha.mockResolvedValue();
    convitesRepositorio.marcarUsado.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('procura o convite pelo hash, nunca pelo token cru', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(conviteValido());

    await request(app).post('/convites/validar').send({ token: TOKEN });

    expect(convitesRepositorio.buscarPorTokenHash).toHaveBeenCalledWith(hashToken(TOKEN));
    expect(convitesRepositorio.buscarPorTokenHash).not.toHaveBeenCalledWith(TOKEN);
  });

  it('validar devolve o nome de quem vai ativar', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(conviteValido());

    const resposta = await request(app).post('/convites/validar').send({ token: TOKEN });

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Beatriz Alves');
  });

  it('recusa convite expirado', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(conviteValido({ expira_em: ONTEM }));

    const resposta = await request(app).post('/convites/validar').send({ token: TOKEN });

    expect(resposta.status).toBe(400);
  });

  it('recusa convite já usado', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(conviteValido({ usado_em: new Date() }));

    const resposta = await request(app).post('/convites/validar').send({ token: TOKEN });

    expect(resposta.status).toBe(400);
  });

  it('token inexistente responde igual a expirado, sem contar qual é o caso', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(null);

    const resposta = await request(app).post('/convites/validar').send({ token: 'qualquer' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('link inválido ou expirado');
  });

  it('define a senha e queima o convite', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(conviteValido());

    const resposta = await request(app)
      .post('/convites/definir-senha')
      .send({ token: TOKEN, senha: 'Girassol2026' });

    expect(resposta.status).toBe(200);
    expect(usuariosRepositorio.atualizarSenha).toHaveBeenCalledWith(3, expect.any(String));
    expect(convitesRepositorio.marcarUsado).toHaveBeenCalledWith(10);
  });

  it('nunca grava a senha em texto puro', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(conviteValido());

    await request(app).post('/convites/definir-senha').send({ token: TOKEN, senha: 'Girassol2026' });

    const hashGravado = usuariosRepositorio.atualizarSenha.mock.calls[0][1];
    expect(hashGravado).not.toBe('Girassol2026');
    expect(hashGravado).toMatch(/^\$2[aby]\$/);
  });

  it('recusa senha fraca e não mexe na conta', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(conviteValido());

    const resposta = await request(app)
      .post('/convites/definir-senha')
      .send({ token: TOKEN, senha: '123' });

    expect(resposta.status).toBe(400);
    expect(usuariosRepositorio.atualizarSenha).not.toHaveBeenCalled();
    expect(convitesRepositorio.marcarUsado).not.toHaveBeenCalled();
  });

  it('convite inválido não define senha nenhuma', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(null);

    const resposta = await request(app)
      .post('/convites/definir-senha')
      .send({ token: 'errado', senha: 'Girassol2026' });

    expect(resposta.status).toBe(400);
    expect(usuariosRepositorio.atualizarSenha).not.toHaveBeenCalled();
  });

  it('barra quem fica tentando adivinhar token', async () => {
    convitesRepositorio.buscarPorTokenHash.mockResolvedValue(null);

    for (let i = 0; i < 20; i += 1) {
      await request(app).post('/convites/validar').send({ token: `tentativa-${i}` });
    }

    const resposta = await request(app).post('/convites/validar').send({ token: 'mais-uma' });
    expect(resposta.status).toBe(429);
  });
});
