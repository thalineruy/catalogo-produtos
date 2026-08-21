jest.mock('../src/repositorios/empresaRepositorio');
jest.mock('../src/repositorios/logsRepositorio');
jest.mock('../src/servicos/armazenamentoLogotipo', () => {
  const original = jest.requireActual('../src/servicos/armazenamentoLogotipo');
  return {
    ...original,
    enviarLogotipo: jest.fn(),
  };
});

const request = require('supertest');
const app = require('../src/servidor');
const empresaRepositorio = require('../src/repositorios/empresaRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const { enviarLogotipo } = require('../src/servicos/armazenamentoLogotipo');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 9, nivel: 'operador' })}`;
const tokenAdministrador = `Bearer ${gerarToken({ id: 1, nivel: 'administrador' })}`;

describe('PUT /empresa', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 400 quando o CNPJ é inválido', async () => {
    const resposta = await request(app).put('/empresa').set('Authorization', tokenAdministrador).send({
      nome: 'Ótica Visão',
      cnpj: '12.345.678/0001-90',
    });

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: expect.any(String) });
    expect(empresaRepositorio.atualizar).not.toHaveBeenCalled();
  });

  it('atualiza normalmente com CNPJ válido', async () => {
    empresaRepositorio.atualizar.mockResolvedValue({ nome: 'Ótica Visão', cnpj: '11.222.333/0001-81' });

    const resposta = await request(app).put('/empresa').set('Authorization', tokenAdministrador).send({
      nome: 'Ótica Visão',
      cnpj: '11.222.333/0001-81',
    });

    expect(resposta.status).toBe(200);
    expect(empresaRepositorio.atualizar).toHaveBeenCalledTimes(1);
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app).put('/empresa').set('Authorization', tokenOperador).send({
      nome: 'Ótica Visão',
      cnpj: '11.222.333/0001-81',
    });

    expect(resposta.status).toBe(403);
    expect(empresaRepositorio.atualizar).not.toHaveBeenCalled();
  });

  it('responde 401 sem token de acesso', async () => {
    const resposta = await request(app).put('/empresa').send({ nome: 'x', cnpj: 'x' });
    expect(resposta.status).toBe(401);
  });
});

describe('POST /empresa/logotipo', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 400 quando o tipo de arquivo não é permitido', async () => {
    const resposta = await request(app)
      .post('/empresa/logotipo')
      .set('Authorization', tokenAdministrador)
      .attach('logotipo', Buffer.from('conteudo qualquer'), { filename: 'arquivo.pdf', contentType: 'application/pdf' });

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: expect.any(String) });
    expect(enviarLogotipo).not.toHaveBeenCalled();
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app)
      .post('/empresa/logotipo')
      .set('Authorization', tokenOperador)
      .attach('logotipo', Buffer.from('conteudo'), { filename: 'logo.png', contentType: 'image/png' });

    expect(resposta.status).toBe(403);
    expect(enviarLogotipo).not.toHaveBeenCalled();
  });

  it('aceita PNG e devolve a empresa atualizada', async () => {
    enviarLogotipo.mockResolvedValue('https://exemplo.supabase.co/storage/v1/object/public/logotipos/logo.png');
    empresaRepositorio.atualizarLogotipo.mockResolvedValue({ url_logotipo: 'https://exemplo.supabase.co/logo.png' });

    const resposta = await request(app)
      .post('/empresa/logotipo')
      .set('Authorization', tokenAdministrador)
      .attach('logotipo', Buffer.from('conteudo-png'), { filename: 'logo.png', contentType: 'image/png' });

    expect(resposta.status).toBe(200);
    expect(enviarLogotipo).toHaveBeenCalledTimes(1);
  });
});
