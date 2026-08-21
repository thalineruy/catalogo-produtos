const MOTIVOS_VALIDOS = [
  'venda em loja',
  'transferência entre lojas',
  'perda ou avaria',
  'uso interno ou demonstração',
];

function validarSaida(dados = {}) {
  const erros = [];

  if (!dados.produto_id) {
    erros.push('produto é obrigatório');
  }
  if (dados.quantidade === undefined || dados.quantidade === null || Number(dados.quantidade) <= 0) {
    erros.push('quantidade deve ser maior que zero');
  }
  if (!dados.motivo || !MOTIVOS_VALIDOS.includes(dados.motivo)) {
    erros.push(`motivo deve ser um dos seguintes: ${MOTIVOS_VALIDOS.join(', ')}`);
  }

  return erros;
}

module.exports = { validarSaida, MOTIVOS_VALIDOS };
