jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/repositorios/logsRepositorio');
jest.mock('../src/repositorios/dispositivosConfiaveisRepositorio');
jest.mock('../src/servicos/totp');
jest.mock('../src/servicos/dispositivoConfiavel');
jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/servidor');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const logsRepositorio = require('../src/repositorios/logsRepositorio');
const dispositivosRepositorio = require('../src/repositorios/dispositivosConfiaveisRepositorio');
const totp = require('../src/servicos/totp');
const dispositivoConfiavel = require('../src/servicos/dispositivoConfiavel');

const usuarioBase = { id: 1, nome: 'Ana Souza', email: 'ana@x.com', senha_hash: 'hash', nivel: 'administrador' };

describe('POST /login', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
    usuariosRepositorio.registrarAcesso.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('responde 401 quando a senha é inválida', async () => {
    usuariosRepositorio.buscarPorEmail.mockResolvedValue(usuarioBase);
    bcrypt.compare.mockResolvedValue(false);

    const resposta = await request(app).post('/login').send({ email: 'ana@x.com', senha: 'errada' });

    expect(resposta.status).toBe(401);
  });

  it('pede verificação em duas etapas com QR quando o usuário ainda não tem TOTP configurado', async () => {
    usuariosRepositorio.buscarPorEmail.mockResolvedValue({ ...usuarioBase, totp_secret: null, totp_confirmado_em: null });
    bcrypt.compare.mockResolvedValue(true);
    totp.gerarSegredo.mockReturnValue('SEGREDO123');
    totp.gerarQrCodeDataUrl.mockResolvedValue('data:image/png;base64,abc');
    usuariosRepositorio.salvarTotpSecret.mockResolvedValue();

    const resposta = await request(app).post('/login').send({ email: 'ana@x.com', senha: 'certa' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.pendente).toBe(true);
    expect(resposta.body.configuracao).toEqual({ qrCodeDataUrl: 'data:image/png;base64,abc', chaveManual: 'SEGREDO123' });
    expect(usuariosRepositorio.salvarTotpSecret).toHaveBeenCalledWith(1, 'SEGREDO123');
  });

  it('não gera um novo segredo quando o usuário já tem um, mas ainda não confirmou', async () => {
    usuariosRepositorio.buscarPorEmail.mockResolvedValue({ ...usuarioBase, totp_secret: 'JASECRETO', totp_confirmado_em: null });
    bcrypt.compare.mockResolvedValue(true);
    totp.gerarQrCodeDataUrl.mockResolvedValue('data:image/png;base64,abc');

    const resposta = await request(app).post('/login').send({ email: 'ana@x.com', senha: 'certa' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.configuracao.chaveManual).toBe('JASECRETO');
    expect(usuariosRepositorio.salvarTotpSecret).not.toHaveBeenCalled();
    expect(totp.gerarSegredo).not.toHaveBeenCalled();
  });

  it('não devolve configuração de QR quando o TOTP já está confirmado', async () => {
    usuariosRepositorio.buscarPorEmail.mockResolvedValue({
      ...usuarioBase,
      totp_secret: 'JASECRETO',
      totp_confirmado_em: new Date(),
    });
    bcrypt.compare.mockResolvedValue(true);

    const resposta = await request(app).post('/login').send({ email: 'ana@x.com', senha: 'certa' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.pendente).toBe(true);
    expect(resposta.body.configuracao).toBeNull();
  });

  it('pula a verificação em duas etapas quando o dispositivo é confiável', async () => {
    usuariosRepositorio.buscarPorEmail.mockResolvedValue({
      ...usuarioBase,
      totp_secret: 'JASECRETO',
      totp_confirmado_em: new Date(),
    });
    bcrypt.compare.mockResolvedValue(true);
    dispositivoConfiavel.hashToken.mockReturnValue('hash-do-token');
    dispositivosRepositorio.buscarValido.mockResolvedValue({ id: 5 });

    const resposta = await request(app)
      .post('/login')
      .send({ email: 'ana@x.com', senha: 'certa', dispositivoToken: 'token-do-navegador' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toEqual(expect.any(String));
    expect(resposta.body.pendente).toBeUndefined();
  });
});

describe('POST /login/verificar-codigo', () => {
  beforeEach(() => {
    logsRepositorio.registrar.mockResolvedValue();
    usuariosRepositorio.registrarAcesso.mockResolvedValue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function tokenPendenteValido(id = 1) {
    return jwt.sign({ id, pendente: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
  }

  it('responde 400 sem código', async () => {
    const resposta = await request(app).post('/login/verificar-codigo').send({ tokenPendente: 'x' });
    expect(resposta.status).toBe(400);
  });

  it('responde 401 quando o token pendente é inválido', async () => {
    const resposta = await request(app)
      .post('/login/verificar-codigo')
      .send({ tokenPendente: 'token-invalido', codigo: '123456' });

    expect(resposta.status).toBe(401);
  });

  it('responde 401 quando um token de sessão normal (não pendente) é usado', async () => {
    const tokenNormal = jwt.sign({ id: 1, nome: 'Ana', nivel: 'operador' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const resposta = await request(app)
      .post('/login/verificar-codigo')
      .send({ tokenPendente: tokenNormal, codigo: '123456' });

    expect(resposta.status).toBe(401);
  });

  it('responde 401 quando o código está incorreto', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ ...usuarioBase, totp_secret: 'JASECRETO', totp_confirmado_em: new Date() });
    totp.verificarCodigo.mockReturnValue(false);

    const resposta = await request(app)
      .post('/login/verificar-codigo')
      .send({ tokenPendente: tokenPendenteValido(), codigo: '000000' });

    expect(resposta.status).toBe(401);
  });

  it('confirma o TOTP na primeira verificação bem-sucedida e devolve o token de sessão', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ ...usuarioBase, totp_secret: 'JASECRETO', totp_confirmado_em: null });
    totp.verificarCodigo.mockReturnValue(true);
    usuariosRepositorio.confirmarTotp.mockResolvedValue();

    const resposta = await request(app)
      .post('/login/verificar-codigo')
      .send({ tokenPendente: tokenPendenteValido(), codigo: '123456' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toEqual(expect.any(String));
    expect(usuariosRepositorio.confirmarTotp).toHaveBeenCalledWith(1);
  });

  it('cria um dispositivo confiável quando confiarDispositivo é marcado', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ ...usuarioBase, totp_secret: 'JASECRETO', totp_confirmado_em: new Date() });
    totp.verificarCodigo.mockReturnValue(true);
    dispositivoConfiavel.gerarToken.mockReturnValue('token-novo');
    dispositivoConfiavel.hashToken.mockReturnValue('hash-novo');
    dispositivoConfiavel.calcularExpiracao.mockReturnValue(new Date());
    dispositivosRepositorio.criar.mockResolvedValue();

    const resposta = await request(app)
      .post('/login/verificar-codigo')
      .send({ tokenPendente: tokenPendenteValido(), codigo: '123456', confiarDispositivo: true });

    expect(resposta.status).toBe(200);
    expect(resposta.body.dispositivoToken).toBe('token-novo');
    expect(dispositivosRepositorio.criar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 1, tokenHash: 'hash-novo' }),
    );
  });

  it('um token pendente não serve para acessar rotas protegidas', async () => {
    const respostaUsuarios = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${tokenPendenteValido()}`);

    expect(respostaUsuarios.status).toBe(401);
  });

  it('não cria dispositivo confiável quando confiarDispositivo não é marcado', async () => {
    usuariosRepositorio.buscarPorId.mockResolvedValue({ ...usuarioBase, totp_secret: 'JASECRETO', totp_confirmado_em: new Date() });
    totp.verificarCodigo.mockReturnValue(true);

    const resposta = await request(app)
      .post('/login/verificar-codigo')
      .send({ tokenPendente: tokenPendenteValido(), codigo: '123456' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.dispositivoToken).toBeUndefined();
    expect(dispositivosRepositorio.criar).not.toHaveBeenCalled();
  });
});
