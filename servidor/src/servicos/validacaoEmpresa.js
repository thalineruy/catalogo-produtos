const { validarCnpj } = require('./validacaoCnpj');

function validarDadosEmpresa(dados = {}) {
  const erros = [];

  if (!dados.nome || !String(dados.nome).trim()) {
    erros.push('nome é obrigatório');
  }
  if (!dados.cnpj || !validarCnpj(dados.cnpj)) {
    erros.push('CNPJ inválido');
  }
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
    erros.push('email inválido');
  }

  return erros;
}

module.exports = { validarDadosEmpresa };
