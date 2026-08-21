function validarProduto(dados = {}) {
  const erros = [];

  if (!dados.nome || !String(dados.nome).trim()) {
    erros.push('nome é obrigatório');
  }
  if (!dados.categoria_id) {
    erros.push('categoria é obrigatória');
  }
  if (!dados.codigo_interno || !String(dados.codigo_interno).trim()) {
    erros.push('código interno é obrigatório');
  }
  if (dados.quantidade !== undefined && dados.quantidade !== null && Number(dados.quantidade) < 0) {
    erros.push('quantidade não pode ser negativa');
  }
  if (
    dados.estoque_minimo !== undefined &&
    dados.estoque_minimo !== null &&
    Number(dados.estoque_minimo) < 0
  ) {
    erros.push('estoque mínimo não pode ser negativo');
  }

  return erros;
}

module.exports = { validarProduto };
