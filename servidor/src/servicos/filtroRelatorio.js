function dentroDoPeriodo(dataSaidaIso, dataInicial, dataFinal) {
  const dataSaida = new Date(dataSaidaIso);

  if (dataInicial && dataSaida < new Date(`${dataInicial}T00:00:00`)) return false;
  if (dataFinal && dataSaida > new Date(`${dataFinal}T23:59:59.999`)) return false;

  return true;
}

function aplicarFiltrosRelatorio(saidas, filtros = {}) {
  const { dataInicial, dataFinal, operador, categoria, estoqueMinimo } = filtros;

  return saidas.filter((saida) => {
    if (!dentroDoPeriodo(saida.data_saida, dataInicial, dataFinal)) return false;
    if (operador && String(saida.usuario_id) !== String(operador)) return false;
    if (categoria && saida.categoria_nome !== categoria) return false;
    if (estoqueMinimo && !(saida.estoque_atual <= saida.estoque_minimo)) return false;
    return true;
  });
}

module.exports = { aplicarFiltrosRelatorio };
