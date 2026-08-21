jest.mock('../src/db', () => ({ pool: { query: jest.fn() } }));

const { pool } = require('../src/db');
const logsRepositorio = require('../src/repositorios/logsRepositorio');

describe('logsRepositorio.listar', () => {
  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('operador pedindo logs de outro operador recebe apenas os próprios', async () => {
    await logsRepositorio.listar({
      usuarioIdSolicitante: 7,
      nivelSolicitante: 'operador',
      operador: '42',
    });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('l.usuario_id = $1');
    expect(params).toEqual([7]);
    expect(params).not.toContain('42');
  });

  it('administrador recebe os logs de todos quando não filtra por operador', async () => {
    await logsRepositorio.listar({
      usuarioIdSolicitante: 1,
      nivelSolicitante: 'administrador',
    });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('WHERE');
    expect(params).toEqual([]);
  });

  it('a data final inclui o dia inteiro, não apenas a meia-noite', async () => {
    await logsRepositorio.listar({
      usuarioIdSolicitante: 1,
      nivelSolicitante: 'administrador',
      fim: '2026-08-21',
    });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("interval '1 day'");
    expect(sql).not.toMatch(/l\.criado_em <= \$\d/);
    expect(params).toEqual(['2026-08-21']);
  });

  it('administrador filtrando por operador específico recebe só daquele operador', async () => {
    await logsRepositorio.listar({
      usuarioIdSolicitante: 1,
      nivelSolicitante: 'administrador',
      operador: '42',
    });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('l.usuario_id = $1');
    expect(params).toEqual(['42']);
  });
});
