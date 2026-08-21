const {
  lerPaginacao,
  montarResposta,
  POR_PAGINA_PADRAO,
  POR_PAGINA_MAXIMO,
} = require('../src/servicos/paginacao');

describe('lerPaginacao', () => {
  it('usa a primeira página e o tamanho padrão quando nada é pedido', () => {
    expect(lerPaginacao({})).toEqual({ pagina: 1, porPagina: POR_PAGINA_PADRAO, deslocamento: 0 });
  });

  it('calcula o deslocamento a partir da página', () => {
    expect(lerPaginacao({ pagina: '3', porPagina: '10' })).toEqual({
      pagina: 3,
      porPagina: 10,
      deslocamento: 20,
    });
  });

  it('nunca aceita página menor que 1', () => {
    expect(lerPaginacao({ pagina: '0' }).pagina).toBe(1);
    expect(lerPaginacao({ pagina: '-5' }).pagina).toBe(1);
    expect(lerPaginacao({ pagina: 'abc' }).pagina).toBe(1);
  });

  it('limita o tamanho da página, para ninguém pedir a base inteira', () => {
    expect(lerPaginacao({ porPagina: '99999' }).porPagina).toBe(POR_PAGINA_MAXIMO);
  });

  it('ignora tamanho de página inválido e usa o padrão', () => {
    expect(lerPaginacao({ porPagina: '0' }).porPagina).toBe(POR_PAGINA_PADRAO);
    expect(lerPaginacao({ porPagina: 'muitos' }).porPagina).toBe(POR_PAGINA_PADRAO);
  });
});

describe('montarResposta', () => {
  it('separa os itens do total e não devolve a coluna de contagem', () => {
    const linhas = [
      { id: 1, nome: 'A', total_geral: '7' },
      { id: 2, nome: 'B', total_geral: '7' },
    ];

    const resposta = montarResposta(linhas, { pagina: 1, porPagina: 2 });

    expect(resposta.itens).toEqual([{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }]);
    expect(resposta.total).toBe(7);
    expect(resposta.totalPaginas).toBe(4);
    expect(JSON.stringify(resposta)).not.toContain('total_geral');
  });

  it('numa lista vazia devolve total zero e uma página', () => {
    const resposta = montarResposta([], { pagina: 1, porPagina: 25 });

    expect(resposta).toEqual({ itens: [], total: 0, pagina: 1, porPagina: 25, totalPaginas: 1 });
  });
});
