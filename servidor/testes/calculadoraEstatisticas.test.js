const { calcularEstatisticas, ultimosSeisMeses } = require('../src/servicos/calculadoraEstatisticas');

const categorias = [
  { id: 1, nome: 'Armações' },
  { id: 2, nome: 'Óculos de Sol' },
];

const produtos = [
  { id: 1, quantidade: 25, estoque_minimo: 5, status: 'ativo', categoria_id: 1 },
  { id: 2, quantidade: 3, estoque_minimo: 5, status: 'ativo', categoria_id: 1 },
  { id: 3, quantidade: 0, estoque_minimo: 5, status: 'inativo', categoria_id: 2 },
];

const dataReferencia = new Date('2026-08-15T00:00:00.000Z');

const saidas = [
  { id: 1, quantidade: 2, data_saida: '2026-08-01T10:00:00.000Z', categoria_id: 1 },
  { id: 2, quantidade: 5, data_saida: '2026-07-10T10:00:00.000Z', categoria_id: 1 },
  { id: 3, quantidade: 1, data_saida: '2026-01-01T10:00:00.000Z', categoria_id: 2 },
];

describe('calcularEstatisticas', () => {
  const resultado = calcularEstatisticas({ produtos, categorias, saidas, dataReferencia });

  it('conta produtos, ativos, baixo estoque e zerados corretamente', () => {
    expect(resultado.totalProdutos).toBe(3);
    expect(resultado.totalProdutosAtivos).toBe(2);
    expect(resultado.produtosEstoqueBaixo).toBe(1);
    expect(resultado.produtosZerados).toBe(1);
    expect(resultado.unidadesEmEstoque).toBe(28);
  });

  it('soma saídas e unidades saídas corretamente', () => {
    expect(resultado.totalSaidas).toBe(3);
    expect(resultado.unidadesSaidas).toBe(8);
  });

  it('conta categorias', () => {
    expect(resultado.numeroCategorias).toBe(2);
  });

  it('calcula estoque por categoria batendo com os produtos', () => {
    expect(resultado.estoquePorCategoria).toEqual([
      { categoria: 'Armações', unidades: 28 },
      { categoria: 'Óculos de Sol', unidades: 0 },
    ]);
  });

  it('agrupa saídas dos últimos 6 meses, ignorando saída fora da janela', () => {
    expect(resultado.saidasPorMes).toHaveLength(6);
    expect(resultado.saidasPorMes.map((m) => m.mes)).toEqual([
      '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
    ]);

    const agosto = resultado.saidasPorMes.find((m) => m.mes === '2026-08');
    expect(agosto).toEqual({ mes: '2026-08', rotulo: 'ago/2026', registros: 1, unidades: 2 });

    const totalUnidadesNaJanela = resultado.saidasPorMes.reduce((total, m) => total + m.unidades, 0);
    expect(totalUnidadesNaJanela).toBe(7);
  });
});

describe('ultimosSeisMeses', () => {
  it('devolve 6 meses terminando no mês de referência', () => {
    expect(ultimosSeisMeses(dataReferencia)).toEqual([
      '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
    ]);
  });
});
