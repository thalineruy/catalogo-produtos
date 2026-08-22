jest.mock('../src/repositorios/logsRepositorio');
jest.mock('../src/repositorios/solicitacoesRepositorio');
jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/servicos/email');

const request = require('supertest');
const app = require('../src/servidor');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const solicitacoesRepositorio = require('../src/repositorios/solicitacoesRepositorio');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const email = require('../src/servicos/email');
const recuperacaoRotas = require('../src/rotas/recuperacaoSenha');

describe('POST /recuperacao-senha', () => {
  beforeEach(() => {
    // O limite é por IP e vale entre um teste e outro: sem zerar, os
    // últimos casos receberiam 429 por causa dos primeiros.
    recuperacaoRotas.limitador.zerar();
    solicitacoesRepositorio.registrar.mockResolvedValue({ id: 1, criado_em: new Date() });
    usuariosRepositorio.listarEmailsDeAdministradores.mockResolvedValue([]);
    email.enviar.mockResolvedValue({ enviado: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 400 quando o e-mail é inválido', async () => {
    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'não-é-um-email', motivo: 'Esqueci a senha' });

    expect(resposta.status).toBe(400);
    expect(logsRepositorio.registrar).not.toHaveBeenCalled();
  });

  it('responde 400 quando o motivo não é um dos valores aceitos', async () => {
    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'ana@oticavisao.com', motivo: 'qualquer coisa' });

    expect(resposta.status).toBe(400);
    expect(logsRepositorio.registrar).not.toHaveBeenCalled();
  });

  it('registra o pedido como log sem usuário autenticado e responde 201', async () => {
    logsRepositorio.registrar.mockResolvedValue();

    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'ana@oticavisao.com', motivo: 'Esqueci a senha' });

    expect(resposta.status).toBe(201);
    expect(logsRepositorio.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: null, tipo: 'Recuperação' }),
    );
  });

  it('não exige token de autenticação', async () => {
    logsRepositorio.registrar.mockResolvedValue();

    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'ana@oticavisao.com', motivo: 'Troquei de celular' });

    expect(resposta.status).not.toBe(401);
  });
});
