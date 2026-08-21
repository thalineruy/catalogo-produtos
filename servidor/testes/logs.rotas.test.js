jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 7, nome: 'Operador', nivel: 'operador' })}`;
const tokenAdministrador = `Bearer ${gerarToken({ id: 1, nome: 'Admin', nivel: 'administrador' })}`;

describe('GET /logs', () => {
  beforeEach(() => {
    logsRepositorio.listar.mockResolvedValue([]);
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('operador pedindo logs de outro operador recebe apenas os próprios', async () => {
    await request(app).get('/logs?operador=42').set('Authorization', tokenOperador);

    expect(logsRepositorio.listar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioIdSolicitante: 7, nivelSolicitante: 'operador' }),
    );

    const argumentos = logsRepositorio.listar.mock.calls[0][0];
    expect(argumentos.usuarioIdSolicitante).toBe(7);
  });

  it('administrador recebe os logs de todos, respeitando o filtro de operador quando informado', async () => {
    await request(app).get('/logs?operador=42').set('Authorization', tokenAdministrador);

    expect(logsRepositorio.listar).toHaveBeenCalledWith(
      expect.objectContaining({ nivelSolicitante: 'administrador', operador: '42' }),
    );
  });

  it('administrador sem filtro de operador recebe todos', async () => {
    await request(app).get('/logs').set('Authorization', tokenAdministrador);

    expect(logsRepositorio.listar).toHaveBeenCalledWith(
      expect.objectContaining({ nivelSolicitante: 'administrador', operador: undefined }),
    );
  });

  it('responde 401 sem token de acesso', async () => {
    const resposta = await request(app).get('/logs');

    expect(resposta.status).toBe(401);
    expect(logsRepositorio.listar).not.toHaveBeenCalled();
  });
});
