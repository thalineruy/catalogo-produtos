const { aplicarFiltrosRelatorio } = require('../src/servicos/filtroRelatorio');

const saidas = [
  { id: 1, categoria_nome: 'Armações', usuario_id: 3, estoque_atual: 25, estoque_minimo: 5, quantidade: 2, data_saida: '2026-08-01T10:00:00.000Z' },
  { id: 2, categoria_nome: 'Lentes de Contato', usuario_id: 4, estoque_atual: 2, estoque_minimo: 8, quantidade: 6, data_saida: '2026-08-12T10:00:00.000Z' },
  { id: 3, categoria_nome: 'Armações', usuario_id: 3, estoque_atual: 3, estoque_minimo: 5, quantidade: 1, data_saida: '2026-08-20T10:00:00.000Z' },
];

describe('aplicarFiltrosRelatorio - período', () => {
  it('não traz saídas fora do intervalo', () => {
    const resultado = aplicarFiltrosRelatorio(saidas, { dataInicial: '2026-08-05', dataFinal: '2026-08-15' });

    expect(resultado.map((s) => s.id)).toEqual([2]);
  });

  it('sem período informado, traz todas', () => {
    const resultado = aplicarFiltrosRelatorio(saidas, {});
    expect(resultado).toHaveLength(3);
  });
});

describe('aplicarFiltrosRelatorio - outros filtros', () => {
  it('filtra por operador', () => {
    const resultado = aplicarFiltrosRelatorio(saidas, { operador: '3' });
    expect(resultado.map((s) => s.id)).toEqual([1, 3]);
  });

  it('filtra por categoria', () => {
    const resultado = aplicarFiltrosRelatorio(saidas, { categoria: 'Lentes de Contato' });
    expect(resultado.map((s) => s.id)).toEqual([2]);
  });

  it('filtra por estoque no mínimo ou abaixo', () => {
    const resultado = aplicarFiltrosRelatorio(saidas, { estoqueMinimo: 'true' });
    expect(resultado.map((s) => s.id)).toEqual([2, 3]);
  });
});
