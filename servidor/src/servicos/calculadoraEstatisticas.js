const NOMES_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function chaveMes(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function rotuloMes(chave) {
  const [ano, mes] = chave.split('-');
  return `${NOMES_MESES[Number(mes) - 1]}/${ano}`;
}

function ultimosSeisMeses(dataReferencia = new Date()) {
  const meses = [];
  for (let i = 5; i >= 0; i -= 1) {
    const data = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth() - i, 1);
    meses.push(`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}

function calcularEstatisticas({ produtos, categorias, saidas, dataReferencia }) {
  const totalProdutos = produtos.length;
  const totalProdutosAtivos = produtos.filter((p) => p.status === 'ativo').length;
  const produtosEstoqueBaixo = produtos.filter((p) => p.quantidade > 0 && p.quantidade <= p.estoque_minimo).length;
  const produtosZerados = produtos.filter((p) => p.quantidade === 0).length;
  const unidadesEmEstoque = produtos.reduce((total, p) => total + p.quantidade, 0);

  const totalSaidas = saidas.length;
  const unidadesSaidas = saidas.reduce((total, s) => total + s.quantidade, 0);

  const meses = ultimosSeisMeses(dataReferencia);
  const saidasPorMes = meses.map((chave) => {
    const doMes = saidas.filter((s) => chaveMes(s.data_saida) === chave);
    return {
      mes: chave,
      rotulo: rotuloMes(chave),
      registros: doMes.length,
      unidades: doMes.reduce((total, s) => total + s.quantidade, 0),
    };
  });

  const estoquePorCategoria = categorias.map((categoria) => ({
    categoria: categoria.nome,
    unidades: produtos
      .filter((p) => p.categoria_id === categoria.id)
      .reduce((total, p) => total + p.quantidade, 0),
  }));

  return {
    totalProdutos,
    totalProdutosAtivos,
    totalSaidas,
    unidadesSaidas,
    produtosEstoqueBaixo,
    produtosZerados,
    unidadesEmEstoque,
    numeroCategorias: categorias.length,
    saidasPorMes,
    estoquePorCategoria,
  };
}

module.exports = { calcularEstatisticas, ultimosSeisMeses, chaveMes };
