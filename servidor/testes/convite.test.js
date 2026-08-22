const { gerarToken, hashToken, calcularExpiracao, montarLink, HORAS_VALIDADE } = require('../src/servicos/convite');

describe('convite de acesso', () => {
  it('gera tokens diferentes a cada chamada', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => gerarToken()));
    expect(tokens.size).toBe(50);
  });

  it('gera token longo o bastante para não ser adivinhado', () => {
    // 32 bytes em base64url dão 43 caracteres
    expect(gerarToken().length).toBeGreaterThanOrEqual(43);
  });

  it('token não contém caracteres que quebrem uma URL', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(gerarToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('hash é determinístico e não devolve o token', () => {
    const token = gerarToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it('tokens diferentes dão hashes diferentes', () => {
    expect(hashToken(gerarToken())).not.toBe(hashToken(gerarToken()));
  });

  it('expiração cai dentro da validade combinada', () => {
    const expira = calcularExpiracao().getTime();
    const esperado = Date.now() + HORAS_VALIDADE * 60 * 60 * 1000;
    expect(Math.abs(expira - esperado)).toBeLessThan(2000);
  });

  it('monta o link sem barra dobrada', () => {
    expect(montarLink('abc', 'https://exemplo.com/')).toBe('https://exemplo.com/ativar.html?token=abc');
    expect(montarLink('abc', 'https://exemplo.com')).toBe('https://exemplo.com/ativar.html?token=abc');
  });

  it('escapa o token no link', () => {
    // base64url não produz esses caracteres, mas o link não pode quebrar
    // se um dia o formato mudar.
    expect(montarLink('a+b/c=', 'https://exemplo.com')).toContain('a%2Bb%2Fc%3D');
  });
});
