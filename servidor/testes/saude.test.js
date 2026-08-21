jest.mock('../src/db', () => ({ pool: { query: jest.fn() } }));

const request = require('supertest');
const app = require('../src/servidor');
const { pool } = require('../src/db');

describe('GET /saude', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 200 quando o banco responde', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const resposta = await request(app).get('/saude');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok', banco: 'ok' });
  });

  it('responde 503 quando o banco está inacessível', async () => {
    // Sem isto a rota respondia "ok" mesmo com o banco fora, que é
    // justamente quando ela precisa avisar.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockRejectedValue(new Error('connect ENETUNREACH'));

    const resposta = await request(app).get('/saude');

    expect(resposta.status).toBe(503);
    expect(resposta.body).toEqual({ status: 'degradado', banco: 'fora' });
  });
});
