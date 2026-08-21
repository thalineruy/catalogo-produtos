const { aplicarFiltros } = require('../src/servicos/filtroProdutos');

const produtos = [
  {
    id: 1,
    nome: 'Varilux Confort Max 1.59 Blue com Crizal Rock',
    codigo_interno: 'LT-101',
    categoria_nome: 'Lentes Oftálmicas',
    descricao: 'Lente multifocal com tratamento antirreflexo',
    quantidade: 10,
    estoque_minimo: 5,
    status: 'ativo',
    url_imagem: 'https://exemplo.com/lt-101.jpg',
  },
  {
    id: 2,
    nome: 'Armação Metal Aviador',
    codigo_interno: 'OT-050',
    categoria_nome: 'Armações',
    descricao: 'Armação em metal dourado',
    quantidade: 3,
    estoque_minimo: 5,
    status: 'ativo',
    url_imagem: null,
  },
  {
    id: 3,
    nome: 'Óculos de Sol Infantil',
    codigo_interno: 'OT-080',
    categoria_nome: 'Óculos de Sol',
    descricao: 'Armação flexível para crianças',
    quantidade: 0,
    estoque_minimo: 5,
    status: 'ativo',
    url_imagem: null,
  },
  {
    id: 4,
    nome: 'estojo rígido para óculos',
    codigo_interno: 'AC-010',
    categoria_nome: 'Acessórios',
    descricao: 'estojo compacto',
    quantidade: 40,
    estoque_minimo: 10,
    status: 'ativo',
    url_imagem: null,
  },
];

describe('aplicarFiltros - busca textual', () => {
  it('encontra o produto buscando por uma palavra do meio do nome', () => {
    const resultado = aplicarFiltros(produtos, { busca: 'Max' });

    expect(resultado.map((p) => p.id)).toEqual([1]);
  });

  it('encontra produto com acento buscando sem acento', () => {
    const resultado = aplicarFiltros(produtos, { busca: 'oculos' });

    expect(resultado.map((p) => p.id)).toEqual(expect.arrayContaining([3, 4]));
  });

  it('encontra produto em minúsculas buscando em maiúsculas', () => {
    const resultado = aplicarFiltros(produtos, { busca: 'ESTOJO' });

    expect(resultado.map((p) => p.id)).toEqual([4]);
  });
});

describe('aplicarFiltros - estoque', () => {
  it('filtro de estoque baixo não traz produto zerado', () => {
    const resultado = aplicarFiltros(produtos, { estoque: 'baixo' });

    expect(resultado.map((p) => p.id)).toEqual([2]);
    expect(resultado.some((p) => p.quantidade === 0)).toBe(false);
  });
});
