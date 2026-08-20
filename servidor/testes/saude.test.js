const request = require('supertest');
const app = require('../src/servidor');

describe('GET /saude', () => {
  it('deve responder com status ok', async () => {
    const resposta = await request(app).get('/saude');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });
});
