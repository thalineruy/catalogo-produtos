jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 9, nivel: 'operador' })}`;
const tokenAdministrador = `Bearer ${gerarToken({ id: 1, nivel: 'administrador' })}`;

describe('GET /usuarios', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app).get('/usuarios').set('Authorization', tokenOperador);
    expect(resposta.status).toBe(403);
  });

  it('nunca devolve o hash da senha', async () => {
    usuariosRepositorio.listar.mockResolvedValue([{ id: 1, nome: 'Ana', email: 'ana@x.com', nivel: 'administrador' }]);

    const resposta = await request(app).get('/usuarios').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(200);
    const textoResposta = JSON.stringify(resposta.body);
    expect(textoResposta).not.toMatch(/senha_hash|senhaHash/i);
  });
});

describe('PUT /usuarios/:id/nivel', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 409 quando o administrador tenta rebaixar a própria conta', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Admin', nivel: 'administrador' });

    const resposta = await request(app)
      .put('/usuarios/1/nivel')
      .set('Authorization', tokenAdministrador)
      .send({ nivel: 'operador' });

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: expect.any(String) });
    expect(usuariosRepositorio.atualizarNivel).not.toHaveBeenCalled();
  });

  it('permite alterar o nível de outro usuário', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ id: 2, nome: 'Beatriz', nivel: 'operador' });
    usuariosRepositorio.atualizarNivel.mockResolvedValue({ id: 2, nome: 'Beatriz', nivel: 'administrador' });

    const resposta = await request(app)
      .put('/usuarios/2/nivel')
      .set('Authorization', tokenAdministrador)
      .send({ nivel: 'administrador' });

    expect(resposta.status).toBe(200);
    expect(usuariosRepositorio.atualizarNivel).toHaveBeenCalledWith('2', 'administrador');
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app)
      .put('/usuarios/2/nivel')
      .set('Authorization', tokenOperador)
      .send({ nivel: 'administrador' });

    expect(resposta.status).toBe(403);
    expect(usuariosRepositorio.atualizarNivel).not.toHaveBeenCalled();
  });
});

describe('DELETE /usuarios/:id', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 409 quando o administrador tenta excluir a própria conta', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ id: 1, nome: 'Admin', email: 'admin@x.com' });

    const resposta = await request(app).delete('/usuarios/1').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(usuariosRepositorio.excluir).not.toHaveBeenCalled();
  });
});
