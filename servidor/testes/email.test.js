const email = require('../src/servicos/email');

const CHAVE_RESEND = process.env.RESEND_API_KEY;
const CHAVE_BREVO = process.env.BREVO_API_KEY;
const REMETENTE = process.env.EMAIL_REMETENTE;

function responder(status, corpo) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => corpo,
  });
}

describe('envio de e-mail', () => {
  function repor(nome, valor) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }

  beforeEach(() => {
    // Cada teste diz qual serviço quer; começar limpo evita que a chave de
    // um vaze para o outro e mude o serviço escolhido.
    delete process.env.RESEND_API_KEY;
    delete process.env.BREVO_API_KEY;
  });

  afterEach(() => {
    repor('RESEND_API_KEY', CHAVE_RESEND);
    repor('BREVO_API_KEY', CHAVE_BREVO);
    repor('EMAIL_REMETENTE', REMETENTE);
    jest.restoreAllMocks();
  });

  it('sem chave nenhuma, entra em modo simulado em vez de falhar', async () => {
    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });
    expect(r).toEqual({ enviado: false, simulado: true });
    expect(email.estaConfigurado()).toBe(false);
  });

  it('com chave e resposta boa, informa que enviou', async () => {
    process.env.RESEND_API_KEY = 'chave-de-teste';
    responder(200, '{"id":"1"}');
    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });
    expect(r.enviado).toBe(true);
    expect(r.simulado).toBe(false);
  });

  it('explica a restrição do remetente de teste, que é a recusa mais comum', async () => {
    process.env.RESEND_API_KEY = 'chave-de-teste';
    responder(403, JSON.stringify({
      message: 'You can only send testing emails to your own email address',
    }));

    const r = await email.enviar({ para: 'outro@b.com', assunto: 'x', texto: 'y' });

    expect(r.enviado).toBe(false);
    expect(r.simulado).toBe(false);
    expect(r.erro).toMatch(/dono da conta/);
    expect(r.erro).toMatch(/Domains/);
  });

  it('chave recusada vira um recado sobre o Render, não um código solto', async () => {
    process.env.RESEND_API_KEY = 'chave-errada';
    responder(401, '{"message":"Invalid API key"}');

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.erro).toMatch(/RESEND_API_KEY/);
    expect(r.erro).toMatch(/Render/);
  });

  it('erro de rede não lança, devolve o motivo', async () => {
    process.env.RESEND_API_KEY = 'chave-de-teste';
    global.fetch = jest.fn().mockRejectedValue(new Error('sem rede'));

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.enviado).toBe(false);
    expect(r.erro).toBe('sem rede');
  });

  it('usa o remetente padrão quando nenhum é configurado', async () => {
    process.env.RESEND_API_KEY = 'chave-de-teste';
    const anterior = process.env.EMAIL_REMETENTE;
    delete process.env.EMAIL_REMETENTE;
    responder(200, '{}');

    await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    const corpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpo.from).toContain('onboarding@resend.dev');

    if (anterior !== undefined) process.env.EMAIL_REMETENTE = anterior;
  });
});

describe('envio pelo Brevo', () => {
  const CHAVE_RESEND = process.env.RESEND_API_KEY;
  const CHAVE_BREVO = process.env.BREVO_API_KEY;
  const REMETENTE = process.env.EMAIL_REMETENTE;

  function repor(nome, valor) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    process.env.BREVO_API_KEY = 'chave-brevo';
    process.env.EMAIL_REMETENTE = 'Ótica Visão <contato@oticavisao.com>';
  });

  afterEach(() => {
    repor('RESEND_API_KEY', CHAVE_RESEND);
    repor('BREVO_API_KEY', CHAVE_BREVO);
    repor('EMAIL_REMETENTE', REMETENTE);
    jest.restoreAllMocks();
  });

  it('o Brevo tem precedência quando as duas chaves existem', () => {
    process.env.RESEND_API_KEY = 'chave-resend';
    expect(email.servicoEscolhido()).toBe('brevo');
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

    const r = await email.enviar({ para: 'a@b.com', assunto: 'Assunto', texto: 'Texto', html: '<p>Oi</p>' });

    expect(r.enviado).toBe(true);
    expect(r.servico).toBe('brevo');

    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(opcoes.headers['api-key']).toBe('chave-brevo');

    const corpo = JSON.parse(opcoes.body);
    expect(corpo.sender).toEqual({ name: 'Ótica Visão', email: 'contato@oticavisao.com' });
    expect(corpo.to).toEqual([{ email: 'a@b.com' }]);
    expect(corpo.textContent).toBe('Texto');
    expect(corpo.htmlContent).toBe('<p>Oi</p>');
  });

  it('explica que o remetente ainda não foi validado', async () => {
    responder(400, JSON.stringify({ code: 'invalid_parameter', message: 'sender is not valid' }));

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.enviado).toBe(false);
    expect(r.erro).toMatch(/contato@oticavisao\.com/);
    expect(r.erro).toMatch(/não foi validado/);
  });

  it('apara espaço e quebra de linha coladas junto com a chave', async () => {
    process.env.BREVO_API_KEY = '  xkeysib-abc\n';
    responder(201, '{}');

    await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(global.fetch.mock.calls[0][1].headers['api-key']).toBe('xkeysib-abc');
  });

  it('chave só com espaço não conta como configurada', () => {
    process.env.BREVO_API_KEY = '   ';
    delete process.env.RESEND_API_KEY;
    expect(email.servicoEscolhido()).toBeNull();
  });

  it('chave recusada aponta para a variável certa', async () => {
    responder(401, '{"message":"Key not found"}');

    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });

    expect(r.erro).toMatch(/BREVO_API_KEY/);
    expect(r.erro).toMatch(/xkeysib-/);
    expect(r.erro).not.toMatch(/RESEND/);
  });
});
