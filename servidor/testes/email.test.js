const email = require('../src/servicos/email');

const CHAVE = process.env.BREVO_API_KEY;
const REMETENTE = process.env.EMAIL_REMETENTE;

function repor(nome, valor) {
  if (valor === undefined) delete process.env[nome];
  else process.env[nome] = valor;
}

function responder(status, corpo) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => corpo,
  });
}

describe('envio de e-mail pelo Brevo', () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = 'xkeysib-teste';
    process.env.EMAIL_REMETENTE = 'Ótica Visão <contato@oticavisao.com>';
  });

  afterEach(() => {
    repor('BREVO_API_KEY', CHAVE);
    repor('EMAIL_REMETENTE', REMETENTE);
    jest.restoreAllMocks();
  });

  it('sem chave, entra em modo simulado em vez de falhar', async () => {
    delete process.env.BREVO_API_KEY;

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r).toEqual({ enviado: false, simulado: true });
    expect(email.estaConfigurado()).toBe(false);
    expect(email.servicoEscolhido()).toBeNull();
  });

  it('com chave, /saude consegue dizer que o envio está de pé', () => {
    expect(email.servicoEscolhido()).toBe('brevo');
  });

  it('chave só com espaço não conta como configurada', () => {
    process.env.BREVO_API_KEY = '   ';
    expect(email.servicoEscolhido()).toBeNull();
  });

  it('apara espaço e quebra de linha coladas junto com a chave', async () => {
    process.env.BREVO_API_KEY = '  xkeysib-abc\n';
    responder(201, '{}');

    await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(global.fetch.mock.calls[0][1].headers['api-key']).toBe('xkeysib-abc');
  });

  it('separa nome e endereço do remetente, que o Brevo pede apartados', () => {
    expect(email.separarRemetente('Ótica Visão <contato@oticavisao.com>')).toEqual({
      nome: 'Ótica Visão',
      endereco: 'contato@oticavisao.com',
    });
    expect(email.separarRemetente('so@endereco.com')).toEqual({
      nome: 'Catálogo de Produtos',
      endereco: 'so@endereco.com',
    });
  });

  it('monta a requisição no formato do Brevo', async () => {
    responder(201, '{"messageId":"1"}');

    const r = await email.enviar({
      para: 'a@b.com', assunto: 'Assunto', texto: 'Texto', html: '<p>Oi</p>',
    });

    expect(r.enviado).toBe(true);

    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(opcoes.headers['api-key']).toBe('xkeysib-teste');

    const corpo = JSON.parse(opcoes.body);
    expect(corpo.sender).toEqual({ name: 'Ótica Visão', email: 'contato@oticavisao.com' });
    expect(corpo.to).toEqual([{ email: 'a@b.com' }]);
    expect(corpo.textContent).toBe('Texto');
    expect(corpo.htmlContent).toBe('<p>Oi</p>');
  });

  it('sem remetente configurado, avisa antes de gastar a chamada', async () => {
    delete process.env.EMAIL_REMETENTE;
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.enviado).toBe(false);
    expect(r.erro).toMatch(/EMAIL_REMETENTE/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('o 401 lembra da lista de IPs, que recusa igual a chave errada', async () => {
    responder(401, '{"message":"Key not found"}');

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.erro).toMatch(/BREVO_API_KEY/);
    expect(r.erro).toMatch(/xkeysib-/);
    expect(r.erro).toMatch(/IPs autorizados/);
  });

  it('explica que o remetente ainda não foi validado', async () => {
    responder(400, JSON.stringify({ code: 'invalid_parameter', message: 'sender is not valid' }));

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.enviado).toBe(false);
    expect(r.erro).toMatch(/contato@oticavisao\.com/);
    expect(r.erro).toMatch(/não foi validado/);
  });

  it('erro de rede não lança, devolve o motivo', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('sem rede'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.enviado).toBe(false);
    expect(r.erro).toBe('sem rede');
  });
});
