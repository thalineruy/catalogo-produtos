const CAMPOS_DISPONIVEIS = {
  nome: { rotulo: 'Nome', extrair: (s) => s.produto_nome },
  codigoInterno: { rotulo: 'Código interno', extrair: (s) => s.codigo_interno },
  categoria: { rotulo: 'Categoria', extrair: (s) => s.categoria_nome },
  estoque: { rotulo: 'Estoque', extrair: (s) => s.estoque_atual },
  operador: { rotulo: 'Operador', extrair: (s) => s.operador_nome },
  dataSaida: { rotulo: 'Data de saída', extrair: (s) => s.data_saida },
  motivo: { rotulo: 'Motivo', extrair: (s) => s.motivo },
  status: { rotulo: 'Status', extrair: (s) => (s.produto_status === 'ativo' ? 'Ativo' : 'Inativo') },
};

function validarCampos(camposTexto) {
  const chaves = String(camposTexto || '')
    .split(',')
    .map((chave) => chave.trim())
    .filter(Boolean);

  if (chaves.length === 0) {
    return { erro: 'selecione ao menos um campo para o relatório' };
  }

  const invalidos = chaves.filter((chave) => !CAMPOS_DISPONIVEIS[chave]);
  if (invalidos.length > 0) {
    return { erro: `campo(s) desconhecido(s): ${invalidos.join(', ')}` };
  }

  return { chaves };
}

function construirRelatorio(saidas, chaves) {
  const colunas = chaves.map((chave) => ({ chave, rotulo: CAMPOS_DISPONIVEIS[chave].rotulo }));

  const linhas = saidas.map((saida) => {
    const linha = {};
    chaves.forEach((chave) => {
      linha[chave] = CAMPOS_DISPONIVEIS[chave].extrair(saida);
    });
    return linha;
  });

  const categoriasDistintas = new Set(saidas.map((saida) => saida.categoria_nome));
  const operadoresDistintos = new Set(saidas.map((saida) => saida.usuario_id));
  const unidadesSaidas = saidas.reduce((total, saida) => total + saida.quantidade, 0);

  return {
    colunas,
    linhas,
    totais: {
      registros: saidas.length,
      unidadesSaidas,
      categorias: categoriasDistintas.size,
      operadores: operadoresDistintos.size,
    },
  };
}

module.exports = { CAMPOS_DISPONIVEIS, validarCampos, construirRelatorio };
