jest.mock('../src/db', () => ({ pool: { query: jest.fn() } }));

const request = require('supertest');
const app = require('../src/servidor');
const { pool } = require('../src/db');

describe('GET /saude', () => {
  const CHAVE_RESEND = process.env.RESEND_API_KEY;
  const CHAVE_BREVO = process.env.BREVO_API_KEY;

  function repor(nome, valor) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.BREVO_API_KEY;
  });

  afterEach(() => {
    repor('RESEND_API_KEY', CHAVE_RESEND);
    repor('BREVO_API_KEY', CHAVE_BREVO);
    jest.resetAllMocks();
  });

  it('responde 200 quando o banco responde', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const resposta = await request(app).get('/saude');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok', banco: 'ok', email: 'nao configurado' });
  });

  it('conta qual serviço de e-mail está ativo', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    process.env.BREVO_API_KEY = 'x';
    expect((await request(app).get('/saude')).body.email).toBe('brevo');

    delete process.env.BREVO_API_KEY;
    process.env.RESEND_API_KEY = 'y';
    expect((await request(app).get('/saude')).body.email).toBe('resend');
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
