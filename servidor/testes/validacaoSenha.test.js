const { conferirSenha, senhaValida } = require('../src/servicos/validacaoSenha');

describe('conferirSenha', () => {
  it('aceita uma senha que atende a todos os critérios', () => {
    expect(conferirSenha('Otica2026Segura')).toEqual([]);
    expect(senhaValida('Otica2026Segura')).toBe(true);
  });

  it('aponta o que falta numa senha curta', () => {
    const pendentes = conferirSenha('Ab1');
    expect(pendentes).toContain('Pelo menos 10 caracteres');
    expect(senhaValida('Ab1')).toBe(false);
  });

  it('cobra letra maiúscula, minúscula e número', () => {
    expect(conferirSenha('aaaaaaaaaaaa')).toEqual(
      expect.arrayContaining(['Uma letra maiúscula', 'Um número']),
    );
    expect(conferirSenha('AAAAAAAAAAAA')).toEqual(
      expect.arrayContaining(['Uma letra minúscula', 'Um número']),
    );
    expect(conferirSenha('Abcdefghijk')).toContain('Um número');
  });

  it('recusa senha que contém o nome do usuário', () => {
    const pendentes = conferirSenha('AnaSouza2026', { nome: 'Ana Souza', email: 'ana.souza@x.com' });
    expect(pendentes).toContain('Não usar seu nome ou e-mail na senha');
  });

  it('recusa senha que contém a parte local do e-mail', () => {
    const pendentes = conferirSenha('Beatriz2026x', { nome: 'Outro Nome', email: 'beatriz@x.com' });
    expect(pendentes).toContain('Não usar seu nome ou e-mail na senha');
  });

  it('não confunde pedaços curtos do nome com uso indevido', () => {
    // "Ana" tem 3 letras: curto demais para ser um critério útil
    expect(conferirSenha('Montanha2026', { nome: 'Ana Souza', email: 'ana@x.com' })).toEqual([]);
  });

  it('numa senha vazia não acusa uso do nome, só os critérios básicos', () => {
    const pendentes = conferirSenha('', { nome: 'Ana Souza', email: 'ana@x.com' });
    expect(pendentes).not.toContain('Não usar seu nome ou e-mail na senha');
    expect(pendentes).toContain('Pelo menos 10 caracteres');
  });
});
