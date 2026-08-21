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
  // A sigla vira o logotipo de reserva, então precisa caber no quadrado
  if (dados.sigla && !/^\p{L}{1,3}$/u.test(String(dados.sigla).trim())) {
    erros.push('sigla deve ter de 1 a 3 letras');
  }

  return erros;
}

module.exports = { validarDadosEmpresa };
