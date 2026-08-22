jest.mock('../src/db', () => ({ pool: { query: jest.fn() } }));

const request = require('supertest');
const app = require('../src/servidor');
const { pool } = require('../src/db');

describe('GET /saude', () => {
  const CHAVE_BREVO = process.env.BREVO_API_KEY;

  function repor(nome, valor) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }

  beforeEach(() => {
    delete process.env.BREVO_API_KEY;
  });

  afterEach(() => {
    repor('BREVO_API_KEY', CHAVE_BREVO);
    jest.resetAllMocks();
  });

  it('responde 200 quando o banco responde', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const resposta = await request(app).get('/saude');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok', banco: 'ok', email: 'nao configurado' });
  });

  it('conta se o envio de e-mail está de pé', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    process.env.BREVO_API_KEY = 'x';
    expect((await request(app).get('/saude')).body.email).toBe('brevo');

    delete process.env.BREVO_API_KEY;
    expect((await request(app).get('/saude')).body.email).toBe('nao configurado');
  });

  it('nunca devolve a chave, só o nome do serviço', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    process.env.BREVO_API_KEY = 'chave-secretissima';

    const resposta = await request(app).get('/saude');

    expect(JSON.stringify(resposta.body)).not.toContain('chave-secretissima');
  });

  it('responde 503 quando o banco está inacessível', async () => {
    // Sem isto a rota respondia "ok" mesmo com o banco fora, que é
    // justamente quando ela precisa avisar.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockRejectedValue(new Error('connect ENETUNREACH'));

    const resposta = await request(app).get('/saude');

    expect(resposta.status).toBe(503);
    expect(resposta.body).toEqual({ status: 'degradado', banco: 'fora', email: 'nao configurado' });
  });
});
