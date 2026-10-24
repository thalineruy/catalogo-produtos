jest.mock('../src/repositorios/solicitacoesRepositorio');
jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/repositorios/logsRepositorio');
jest.mock('../src/servicos/email');

const request = require('supertest');
const app = require('../src/servidor');
const solicitacoesRepositorio = require('../src/repositorios/solicitacoesRepositorio');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const email = require('../src/servicos/email');
const recuperacaoRotas = require('../src/rotas/recuperacaoSenha');
const { gerarToken } = require('./ajudantes/token');

const tokenAdministrador = `Bearer ${gerarToken({ id: 1, nome: 'Admin', nivel: 'administrador' })}`;
const tokenOperador = `Bearer ${gerarToken({ id: 7, nome: 'Operador', nivel: 'operador' })}`;

describe('fila de solicitações de acesso', () => {
  beforeEach(() => {
    recuperacaoRotas.limitador.zerar();
    logsRepositorio.registrar.mockResolvedValue();
    solicitacoesRepositorio.registrar.mockResolvedValue({ id: 1, criado_em: new Date() });
    usuariosRepositorio.listarEmailsDeAdministradores.mockResolvedValue([
      { nome: 'Admin', email: 'admin@exemplo.com' },
    ]);
    email.enviar.mockResolvedValue({ enviado: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('o pedido público entra na fila, não só no log', async () => {
    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'alguem@exemplo.com', motivo: 'Esqueci a senha' });

    expect(resposta.status).toBe(201);
    expect(solicitacoesRepositorio.registrar).toHaveBeenCalledWith({
      email: 'alguem@exemplo.com',
      motivo: 'Esqueci a senha',
    });
  });

  it('avisa o administrador por e-mail', async () => {
    await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'alguem@exemplo.com', motivo: 'Troquei de celular' });

    expect(email.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ para: 'admin@exemplo.com' }),
    );
  });

  it('falha no e-mail não derruba o pedido', async () => {
    email.enviar.mockRejectedValue(new Error('sem rede'));

    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'alguem@exemplo.com', motivo: 'Esqueci a senha' });

    expect(resposta.status).toBe(201);
  });

  it('recusa motivo fora da lista', async () => {
    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'alguem@exemplo.com', motivo: 'quero entrar' });

    expect(resposta.status).toBe(400);
    expect(solicitacoesRepositorio.registrar).not.toHaveBeenCalled();
  });

  it('barra depois de cinco pedidos do mesmo endereço', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/recuperacao-senha')
        .send({ email: `p${i}@exemplo.com`, motivo: 'Esqueci a senha' });
    }

    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'sexto@exemplo.com', motivo: 'Esqueci a senha' });

    expect(resposta.status).toBe(429);
    expect(solicitacoesRepositorio.registrar).toHaveBeenCalledTimes(5);
  });

  it('o limite conta antes da validação, senão daria para contornar errando o motivo', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/recuperacao-senha').send({ email: 'x@x.com', motivo: 'invalido' });
    }

    const resposta = await request(app)
      .post('/recuperacao-senha')
      .send({ email: 'x@x.com', motivo: 'Esqueci a senha' });

    expect(resposta.status).toBe(429);
  });

  it('operador não vê a fila', async () => {
    const resposta = await request(app).get('/solicitacoes-acesso').set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
    expect(solicitacoesRepositorio.listar).not.toHaveBeenCalled();
  });

  it('sem token não vê a fila', async () => {
    const resposta = await request(app).get('/solicitacoes-acesso');
    expect(resposta.status).toBe(401);
  });

  it('administrador vê a fila paginada', async () => {
    solicitacoesRepositorio.listar.mockResolvedValue([
      { id: 1, email: 'a@x.com', motivo: 'Esqueci a senha', atendido_em: null, total_geral: '1' },
    ]);

    const resposta = await request(app)
      .get('/solicitacoes-acesso')
      .set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(200);
    expect(resposta.body.itens).toHaveLength(1);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.itens[0].total_geral).toBeUndefined();
  });

  it('administrador marca como atendida', async () => {
    solicitacoesRepositorio.marcarAtendida.mockResolvedValue({
      id: 4, email: 'a@x.com', motivo: 'Esqueci a senha', atendido_em: new Date(),
    });

    const resposta = await request(app)
      .put('/solicitacoes-acesso/4/atendida')
      .set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(200);
    expect(solicitacoesRepositorio.marcarAtendida).toHaveBeenCalledWith('4', 1);
  });

  it('atender duas vezes devolve 404 em vez de sobrescrever quem atendeu', async () => {
    solicitacoesRepositorio.marcarAtendida.mockResolvedValue(null);

    const resposta = await request(app)
      .put('/solicitacoes-acesso/4/atendida')
      .set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(404);
  });

  it('operador não marca como atendida', async () => {
    const resposta = await request(app)
      .put('/solicitacoes-acesso/4/atendida')
      .set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
    expect(solicitacoesRepositorio.marcarAtendida).not.toHaveBeenCalled();
  });

  it('a contagem de pendentes é só para administrador', async () => {
    const resposta = await request(app)
      .get('/solicitacoes-acesso/pendentes')
      .set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
  });
});

describe('POST /solicitacoes-acesso/:id/anonimizar', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('operador não anonimiza', async () => {
    const resposta = await request(app)
      .post('/solicitacoes-acesso/4/anonimizar')
      .set('Authorization', tokenOperador);

    expect(resposta.status).toBe(403);
    expect(solicitacoesRepositorio.anonimizar).not.toHaveBeenCalled();
  });

  it('responde 404 quando o pedido não existe', async () => {
    solicitacoesRepositorio.buscarPorId.mockResolvedValue(null);

    const resposta = await request(app)
      .post('/solicitacoes-acesso/99/anonimizar')
      .set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(404);
  });

  it('recusa anonimizar duas vezes', async () => {
    solicitacoesRepositorio.buscarPorId.mockResolvedValue({
      id: 4, email: 'anonimizado@removido.invalid', anonimizado_em: '2026-10-24T10:00:00',
    });

    const resposta = await request(app)
      .post('/solicitacoes-acesso/4/anonimizar')
      .set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(solicitacoesRepositorio.anonimizar).not.toHaveBeenCalled();
  });

  // Com conta, limpar só o pedido deixaria o e-mail na tabela de usuários
  it('manda usar a anonimização da conta quando o e-mail tem cadastro', async () => {
    solicitacoesRepositorio.buscarPorId.mockResolvedValue({ id: 4, email: 'jose@x.com' });
    usuariosRepositorio.buscarPorEmail.mockResolvedValue({ id: 8, email: 'jose@x.com' });

    const resposta = await request(app)
      .post('/solicitacoes-acesso/4/anonimizar')
      .set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatch(/Gerenciar Usu[áa]rios/i);
    expect(solicitacoesRepositorio.anonimizar).not.toHaveBeenCalled();
  });

  it('apaga o e-mail do pedido e devolve quanto foi limpo', async () => {
    solicitacoesRepositorio.buscarPorId.mockResolvedValue({ id: 4, email: 'jose@x.com' });
    usuariosRepositorio.buscarPorEmail.mockResolvedValue(null);
    solicitacoesRepositorio.anonimizar.mockResolvedValue({ pedidosAnonimizados: 2, registrosLimpos: 3 });

    const resposta = await request(app)
      .post('/solicitacoes-acesso/4/anonimizar')
      .set('Authorization', tokenAdministrador);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ anonimizado: true, pedidosAnonimizados: 2, registrosLimpos: 3 });
    expect(solicitacoesRepositorio.anonimizar).toHaveBeenCalledWith('4', {
      emailAnonimo: 'anonimizado@removido.invalid',
    });
  });

  it('registra a limpeza sem repetir o e-mail', async () => {
    solicitacoesRepositorio.buscarPorId.mockResolvedValue({ id: 4, email: 'jose@x.com' });
    usuariosRepositorio.buscarPorEmail.mockResolvedValue(null);
    solicitacoesRepositorio.anonimizar.mockResolvedValue({ pedidosAnonimizados: 1, registrosLimpos: 0 });

    await request(app).post('/solicitacoes-acesso/4/anonimizar').set('Authorization', tokenAdministrador);

    const registro = logsRepositorio.registrar.mock.calls[0][0];
    expect(registro.detalhes).not.toMatch(/jose@x\.com/);
    expect(registro.detalhes).toMatch(/4/);
  });
});
