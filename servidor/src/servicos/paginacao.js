// Regras de paginação usadas por todas as listagens, para as três telas
// se comportarem igual e nenhuma conseguir pedir a base inteira de uma vez.

const POR_PAGINA_PADRAO = 25;
const POR_PAGINA_MAXIMO = 100;

function lerPaginacao(consulta = {}) {
  const pagina = Math.max(1, Number.parseInt(consulta.pagina, 10) || 1);

  const pedido = Number.parseInt(consulta.porPagina, 10);
  const porPagina = Number.isFinite(pedido) && pedido > 0
    ? Math.min(pedido, POR_PAGINA_MAXIMO)
    : POR_PAGINA_PADRAO;

  return { pagina, porPagina, deslocamento: (pagina - 1) * porPagina };
}

// O total vem junto de cada linha (COUNT(*) OVER()), então numa página
// vazia não há de onde tirá-lo: nesse caso o total é zero mesmo.
function montarResposta(linhas, { pagina, porPagina }) {
  const total = linhas.length ? Number(linhas[0].total_geral) : 0;

  return {
    itens: linhas.map(({ total_geral, ...resto }) => resto),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

module.exports = { lerPaginacao, montarResposta, POR_PAGINA_PADRAO, POR_PAGINA_MAXIMO };
