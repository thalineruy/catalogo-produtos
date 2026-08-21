jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/repositorios/logsRepositorio');
jest.mock('../src/repositorios/dispositivosConfiaveisRepositorio');
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

const request = require('supertest');
const app = require('../src/servidor');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const dispositivosRepositorio = require('../src/repositorios/dispositivosConfiaveisRepositorio');
const bcrypt = require('bcrypt');
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

describe('DELETE /usuarios/:id/totp', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 404 quando o usuário não existe', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue(null);

    const resposta = await request(app).delete('/usuarios/99/totp').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(404);
  });

  it('limpa o TOTP e os dispositivos confiáveis do usuário', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ id: 2, nome: 'Beatriz' });
    usuariosRepositorio.limparTotp.mockResolvedValue();
    dispositivosRepositorio.excluirPorUsuario.mockResolvedValue();

    const resposta = await request(app).delete('/usuarios/2/totp').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(204);
    expect(usuariosRepositorio.limparTotp).toHaveBeenCalledWith('2');
    expect(dispositivosRepositorio.excluirPorUsuario).toHaveBeenCalledWith('2');
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app).delete('/usuarios/2/totp').set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
    expect(usuariosRepositorio.limparTotp).not.toHaveBeenCalled();
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

describe('PUT /usuarios/eu/senha', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 400 sem a senha atual', async () => {
    const resposta = await request(app)
      .put('/usuarios/eu/senha')
      .set('Authorization', tokenOperador)
      .send({ novaSenha: 'Otica2026Segura' });

    expect(resposta.status).toBe(400);
    expect(usuariosRepositorio.atualizarSenha).not.toHaveBeenCalled();
  });

  it('responde 401 quando a senha atual está errada', async () => {
    usuariosRepositorio.buscarPorIdComSenha.mockResolvedValue({
      id: 9, nome: 'Beatriz Alves', email: 'beatriz@x.com', senha_hash: 'hash',
    });
    bcrypt.compare.mockResolvedValue(false);

    const resposta = await request(app)
      .put('/usuarios/eu/senha')
      .set('Authorization', tokenOperador)
      .send({ senhaAtual: 'errada', novaSenha: 'Otica2026Segura' });

    expect(resposta.status).toBe(401);
    expect(usuariosRepositorio.atualizarSenha).not.toHaveBeenCalled();
  });

  it('responde 400 quando a nova senha não atende aos critérios', async () => {
    usuariosRepositorio.buscarPorIdComSenha.mockResolvedValue({
      id: 9, nome: 'Beatriz Alves', email: 'beatriz@x.com', senha_hash: 'hash',
    });
    bcrypt.compare.mockResolvedValue(true);

    const resposta = await request(app)
      .put('/usuarios/eu/senha')
      .set('Authorization', tokenOperador)
      .send({ senhaAtual: 'certa', novaSenha: 'abc' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/10 caracteres/);
    expect(usuariosRepositorio.atualizarSenha).not.toHaveBeenCalled();
  });

  it('recusa repetir a senha atual', async () => {
    usuariosRepositorio.buscarPorIdComSenha.mockResolvedValue({
      id: 9, nome: 'Beatriz Alves', email: 'beatriz@x.com', senha_hash: 'hash',
    });
    // confere a atual e depois compara a nova com a mesma hash
    bcrypt.compare.mockResolvedValue(true);

    const resposta = await request(app)
      .put('/usuarios/eu/senha')
      .set('Authorization', tokenOperador)
      .send({ senhaAtual: 'Otica2026Segura', novaSenha: 'Otica2026Segura' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/diferente da atual/);
    expect(usuariosRepositorio.atualizarSenha).not.toHaveBeenCalled();
  });

  it('troca a senha quando tudo está certo', async () => {
    usuariosRepositorio.buscarPorIdComSenha.mockResolvedValue({
      id: 9, nome: 'Beatriz Alves', email: 'beatriz@x.com', senha_hash: 'hash',
    });
    bcrypt.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    bcrypt.hash.mockResolvedValue('hash-novo');
    usuariosRepositorio.atualizarSenha.mockResolvedValue();

    const resposta = await request(app)
      .put('/usuarios/eu/senha')
      .set('Authorization', tokenOperador)
      .send({ senhaAtual: 'antiga', novaSenha: 'Otica2026Segura' });

    expect(resposta.status).toBe(204);
    expect(usuariosRepositorio.atualizarSenha).toHaveBeenCalledWith(9, 'hash-novo');
  });

  it('responde 401 sem token', async () => {
    const resposta = await request(app).put('/usuarios/eu/senha').send({ senhaAtual: 'a', novaSenha: 'b' });
    expect(resposta.status).toBe(401);
  });
});
