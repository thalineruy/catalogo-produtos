jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/repositorios/convitesRepositorio');
jest.mock('../src/repositorios/empresaRepositorio');
jest.mock('../src/repositorios/logsRepositorio');
jest.mock('../src/servicos/email');

const request = require('supertest');
const app = require('../src/servidor');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const convitesRepositorio = require('../src/repositorios/convitesRepositorio');
const empresaRepositorio = require('../src/repositorios/empresaRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const email = require('../src/servicos/email');
const { gerarToken } = require('./ajudantes/token');

const tokenAdministrador = `Bearer ${gerarToken({ id: 1, nome: 'Admin', nivel: 'administrador' })}`;
const tokenOperador = `Bearer ${gerarToken({ id: 7, nome: 'Operador', nivel: 'operador' })}`;

const NOVO = { nome: 'Beatriz Alves', email: 'beatriz@exemplo.com', nivel: 'operador' };

describe('cadastro de usuário com convite', () => {
  beforeEach(() => {
    usuariosRepositorio.buscarPorEmail.mockResolvedValue(null);
    usuariosRepositorio.criar.mockResolvedValue({ id: 3, ...NOVO });
    usuariosRepositorio.buscarPorId.mockResolvedValue({ id: 3, ...NOVO });
    empresaRepositorio.buscar.mockResolvedValue({ nome: 'Ótica Visão' });
    convitesRepositorio.invalidarDoUsuario.mockResolvedValue();
    convitesRepositorio.criar.mockResolvedValue({ id: 10 });
    logsRepositorio.registrar.mockResolvedValue();
    email.enviar.mockResolvedValue({ enviado: true, simulado: false });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('cria o usuário e emite um convite', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .set('Authorization', tokenAdministrador)
      .send(NOVO);

    expect(resposta.status).toBe(201);
    expect(convitesRepositorio.criar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 3 }),
    );
  });

  it('não devolve senha temporária nenhuma', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .set('Authorization', tokenAdministrador)
      .send(NOVO);

    expect(resposta.body.senhaTemporaria).toBeUndefined();
    expect(JSON.stringify(resposta.body)).not.toMatch(/senhaTemporaria/);
  });

  it('guarda o hash do token, nunca o token', async () => {
    await request(app).post('/usuarios').set('Authorization', tokenAdministrador).send(NOVO);

    const gravado = convitesRepositorio.criar.mock.calls[0][0];
    expect(gravado.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(gravado.token).toBeUndefined();
  });

  it('manda o e-mail para o endereço do novo usuário', async () => {
    await request(app).post('/usuarios').set('Authorization', tokenAdministrador).send(NOVO);

    expect(email.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ para: 'beatriz@exemplo.com' }),
    );
  });

  it('o e-mail leva o link, não a senha', async () => {
    await request(app).post('/usuarios').set('Authorization', tokenAdministrador).send(NOVO);

    const mensagem = email.enviar.mock.calls[0][0];
    expect(mensagem.texto).toContain('ativar.html?token=');
    expect(mensagem.texto).not.toMatch(/senha tempor/i);
  });

  it('com e-mail enviado, o link não volta para a tela', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .set('Authorization', tokenAdministrador)
      .send(NOVO);

    expect(resposta.body.convite.emailEnviado).toBe(true);
    expect(resposta.body.convite.link).toBeNull();
  });

  it('sem serviço de e-mail, o link volta para o administrador repassar', async () => {
    email.enviar.mockResolvedValue({ enviado: false, simulado: true });

    const resposta = await request(app)
      .post('/usuarios')
      .set('Authorization', tokenAdministrador)
      .send(NOVO);

    expect(resposta.status).toBe(201);
    expect(resposta.body.convite.emailSimulado).toBe(true);
    expect(resposta.body.convite.link).toContain('ativar.html?token=');
  });

  it('invalida convites anteriores antes de emitir outro', async () => {
    await request(app).post('/usuarios/3/convite').set('Authorization', tokenAdministrador);

    expect(convitesRepositorio.invalidarDoUsuario).toHaveBeenCalledWith(3);
  });

  it('operador não cadastra usuário', async () => {
    const resposta = await request(app)
      .post('/usuarios')
      .set('Authorization', tokenOperador)
      .send(NOVO);

    expect(resposta.status).toBe(403);
    expect(usuariosRepositorio.criar).not.toHaveBeenCalled();
  });

  it('operador não reenvia convite', async () => {
    const resposta = await request(app).post('/usuarios/3/convite').set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
    expect(convitesRepositorio.criar).not.toHaveBeenCalled();
  });

  it('e-mail repetido continua sendo recusado antes de criar nada', async () => {
    usuariosRepositorio.buscarPorEmail.mockResolvedValue({ id: 9 });

    const resposta = await request(app)
      .post('/usuarios')
      .set('Authorization', tokenAdministrador)
      .send(NOVO);

    expect(resposta.status).toBe(409);
    expect(convitesRepositorio.criar).not.toHaveBeenCalled();
  });
});
