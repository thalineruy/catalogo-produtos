jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const logsRepositorio = require('../src/repositorios/logsRepositorio');

describe('POST /recuperacao-senha', () => {
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
