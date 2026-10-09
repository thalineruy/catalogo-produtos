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

  it('explica que a conta com movimentações precisa ser desativada, e não excluída', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: true,
    });
    const violacao = Object.assign(new Error('update or delete violates foreign key'), { code: '23503' });
    usuariosRepositorio.excluir.mockRejectedValue(violacao);

    const resposta = await request(app).delete('/usuarios/5').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatch(/desative/i);
  });

  it('recusa excluir o único administrador ativo', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Outra Admin', email: 'outra@x.com', nivel: 'administrador', ativo: true,
    });
    usuariosRepositorio.contarAdministradoresAtivos.mockResolvedValue(1);

    const resposta = await request(app).delete('/usuarios/5').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(usuariosRepositorio.excluir).not.toHaveBeenCalled();
  });

  it('exclui quem nunca movimentou nada', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: true,
    });
    usuariosRepositorio.excluir.mockResolvedValue();
    logsRepositorio.registrar.mockResolvedValue();

    const resposta = await request(app).delete('/usuarios/5').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(204);
    expect(usuariosRepositorio.excluir).toHaveBeenCalledWith('5');
  });
});

describe('PUT /usuarios/:id/situacao', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app)
      .put('/usuarios/5/situacao')
      .set('Authorization', tokenOperador)
      .send({ ativo: false });

    expect(resposta.status).toBe(403);
    expect(usuariosRepositorio.definirSituacao).not.toHaveBeenCalled();
  });

  it('responde 400 quando a situação não vem no pedido', async () => {
    const resposta = await request(app)
      .put('/usuarios/5/situacao')
      .set('Authorization', tokenAdministrador)
      .send({});

    expect(resposta.status).toBe(400);
  });

  it('impede que o administrador desative a própria conta', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 1, nome: 'Admin', email: 'admin@x.com', nivel: 'administrador', ativo: true,
    });

    const resposta = await request(app)
      .put('/usuarios/1/situacao')
      .set('Authorization', tokenAdministrador)
      .send({ ativo: false });

    expect(resposta.status).toBe(409);
    expect(usuariosRepositorio.definirSituacao).not.toHaveBeenCalled();
  });

  it('impede desativar o último administrador ativo', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Outra Admin', email: 'outra@x.com', nivel: 'administrador', ativo: true,
    });
    usuariosRepositorio.contarAdministradoresAtivos.mockResolvedValue(1);

    const resposta = await request(app)
      .put('/usuarios/5/situacao')
      .set('Authorization', tokenAdministrador)
      .send({ ativo: false });

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatch(/administrador/i);
    expect(usuariosRepositorio.definirSituacao).not.toHaveBeenCalled();
  });

  it('desativa e registra no histórico', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: true,
    });
    usuariosRepositorio.definirSituacao.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: false,
    });

    const resposta = await request(app)
      .put('/usuarios/5/situacao')
      .set('Authorization', tokenAdministrador)
      .send({ ativo: false });

    expect(resposta.status).toBe(200);
    expect(resposta.body.ativo).toBe(false);
    expect(usuariosRepositorio.definirSituacao).toHaveBeenCalledWith('5', false);
    expect(logsRepositorio.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ detalhes: expect.stringMatching(/Desativou/) }),
    );
  });

  it('reativa sem exigir que haja outro administrador', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: false,
    });
    usuariosRepositorio.definirSituacao.mockResolvedValue({ id: 5, ativo: true });

    const resposta = await request(app)
      .put('/usuarios/5/situacao')
      .set('Authorization', tokenAdministrador)
      .send({ ativo: true });

    expect(resposta.status).toBe(200);
    expect(usuariosRepositorio.definirSituacao).toHaveBeenCalledWith('5', true);
  });
});

describe('POST /usuarios/:id/anonimizar', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
    bcrypt.hash.mockResolvedValue('hash-aleatorio');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 403 quando o token é de operador', async () => {
    const resposta = await request(app).post('/usuarios/5/anonimizar').set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
    expect(usuariosRepositorio.anonimizar).not.toHaveBeenCalled();
  });

  // Dois passos conscientes para uma ação sem volta
  it('exige que a conta esteja desativada antes', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: true,
    });

    const resposta = await request(app).post('/usuarios/5/anonimizar').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatch(/desative/i);
    expect(usuariosRepositorio.anonimizar).not.toHaveBeenCalled();
  });

  it('recusa anonimizar duas vezes', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Usuário anonimizado', email: 'anonimizado-5@removido.invalid',
      nivel: 'operador', ativo: false, anonimizado_em: '2026-10-09T12:00:00',
    });

    const resposta = await request(app).post('/usuarios/5/anonimizar').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(usuariosRepositorio.anonimizar).not.toHaveBeenCalled();
  });

  it('anonimiza a conta desativada e troca a senha guardada', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: false,
    });
    usuariosRepositorio.anonimizar.mockResolvedValue({ registrosLimpos: 3 });

    const resposta = await request(app).post('/usuarios/5/anonimizar').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ anonimizado: true, registrosLimpos: 3 });
    expect(usuariosRepositorio.anonimizar).toHaveBeenCalledWith({
      id: '5',
      senhaHash: 'hash-aleatorio',
      nomeAnonimo: 'Usuário anonimizado',
      emailAnonimo: 'anonimizado-5@removido.invalid',
    });
  });

  // O log é escrito depois da limpeza: com o nome, devolveria ao
  // histórico justamente o dado que acabou de ser removido dele.
  it('registra a anonimização sem repetir o nome nem o e-mail', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: false,
    });
    usuariosRepositorio.anonimizar.mockResolvedValue({ registrosLimpos: 0 });

    await request(app).post('/usuarios/5/anonimizar').set('Authorization', tokenAdministrador);

    const registro = logsRepositorio.registrar.mock.calls[0][0];
    expect(registro.detalhes).not.toMatch(/Carlos Lima/);
    expect(registro.detalhes).not.toMatch(/carlos@x\.com/);
    expect(registro.detalhes).toMatch(/5/);
  });

  it('impede reativar uma conta anonimizada', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Usuário anonimizado', email: 'anonimizado-5@removido.invalid',
      nivel: 'operador', ativo: false, anonimizado_em: '2026-10-09T12:00:00',
    });

    const resposta = await request(app)
      .put('/usuarios/5/situacao')
      .set('Authorization', tokenAdministrador)
      .send({ ativo: true });

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatch(/anonimizada/i);
    expect(usuariosRepositorio.definirSituacao).not.toHaveBeenCalled();
  });
});

describe('ações que não fazem sentido em conta desativada', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('recusa reenviar o link de acesso', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: false,
    });

    const resposta = await request(app).post('/usuarios/5/convite').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatch(/desativada/i);
  });

  it('recusa gerar senha temporária', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({
      id: 5, nome: 'Carlos Lima', email: 'carlos@x.com', nivel: 'operador', ativo: false,
    });

    const resposta = await request(app).post('/usuarios/5/reset-senha').set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(usuariosRepositorio.atualizarSenha).not.toHaveBeenCalled();
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
