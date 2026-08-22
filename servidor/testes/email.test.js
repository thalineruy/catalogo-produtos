const email = require('../src/servicos/email');

const CHAVE_ORIGINAL = process.env.RESEND_API_KEY;

function responder(status, corpo) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => corpo,
  });
}

describe('envio de e-mail', () => {
  afterEach(() => {
    if (CHAVE_ORIGINAL === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = CHAVE_ORIGINAL;
    jest.restoreAllMocks();
  });

  it('sem chave, entra em modo simulado em vez de falhar', async () => {
    delete process.env.RESEND_API_KEY;
    const r = await email.enviar({ para: 'a@b.com', assunto: 'x', texto: 'y' });
    expect(r).toEqual({ enviado: false, simulado: true });
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

  it('usa o remetente de teste quando nenhum é configurado', async () => {
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
