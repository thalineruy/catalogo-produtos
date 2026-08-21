const { validarCnpj } = require('../src/servicos/validacaoCnpj');

describe('validarCnpj', () => {
  it('aceita CNPJ válido, com ou sem formatação', () => {
    expect(validarCnpj('11.222.333/0001-81')).toBe(true);
    expect(validarCnpj('11222333000181')).toBe(true);
  });

  it('rejeita CNPJ com dígitos verificadores errados', () => {
    expect(validarCnpj('12.345.678/0001-90')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(validarCnpj('11.111.111/1111-11')).toBe(false);
  });

  it('rejeita tamanho incorreto', () => {
    expect(validarCnpj('123')).toBe(false);
    expect(validarCnpj('')).toBe(false);
    expect(validarCnpj(undefined)).toBe(false);
  });
});
