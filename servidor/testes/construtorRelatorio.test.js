const { validarCampos, construirRelatorio } = require('../src/servicos/construtorRelatorio');

const saidas = [
  {
    id: 1,
    produto_nome: 'Armação Acetato Preta',
    codigo_interno: 'OT-001',
    categoria_nome: 'Armações',
    estoque_atual: 25,
    estoque_minimo: 5,
    produto_status: 'ativo',
    usuario_id: 3,
    operador_nome: 'Beatriz Alves',
    quantidade: 2,
    motivo: 'venda em loja',
    data_saida: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 2,
    produto_nome: 'Lente de Contato Colorida',
    codigo_interno: 'OT-006',
    categoria_nome: 'Lentes de Contato',
    estoque_atual: 2,
    estoque_minimo: 8,
    produto_status: 'ativo',
    usuario_id: 4,
    operador_nome: 'Diego Ferreira',
    quantidade: 6,
    motivo: 'venda em loja',
    data_saida: '2026-08-12T10:00:00.000Z',
  },
];

describe('validarCampos', () => {
  it('rejeita quando nenhum campo é escolhido', () => {
    expect(validarCampos('')).toEqual({ erro: expect.any(String) });
    expect(validarCampos(undefined)).toEqual({ erro: expect.any(String) });
  });

  it('rejeita campo desconhecido', () => {
    expect(validarCampos('nome,preco')).toEqual({ erro: expect.any(String) });
  });

  it('aceita campos válidos preservando a ordem', () => {
    expect(validarCampos('status,nome,categoria')).toEqual({ chaves: ['status', 'nome', 'categoria'] });
  });
});

describe('construirRelatorio', () => {
  it('traz somente as colunas pedidas, na ordem pedida', () => {
    const relatorio = construirRelatorio(saidas, ['operador', 'nome']);

    expect(relatorio.colunas.map((c) => c.chave)).toEqual(['operador', 'nome']);
    expect(Object.keys(relatorio.linhas[0])).toEqual(['operador', 'nome']);
    expect(relatorio.linhas[0]).toEqual({ operador: 'Beatriz Alves', nome: 'Armação Acetato Preta' });
  });

  it('calcula totais que conferem com as linhas devolvidas', () => {
    const relatorio = construirRelatorio(saidas, ['nome']);

    expect(relatorio.totais).toEqual({
      registros: 2,
      unidadesSaidas: 8,
      categorias: 2,
      operadores: 2,
    });
    expect(relatorio.linhas).toHaveLength(relatorio.totais.registros);
  });

  it('nenhuma resposta contém campo de preço ou valor', () => {
    const todosOsCampos = Object.keys(require('../src/servicos/construtorRelatorio').CAMPOS_DISPONIVEIS);
    const relatorio = construirRelatorio(saidas, todosOsCampos);
    const texto = JSON.stringify(relatorio).toLowerCase();

    expect(texto).not.toMatch(/preco|preço|price|valor/);
  });
});
