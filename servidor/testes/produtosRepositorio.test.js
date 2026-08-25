jest.mock('../src/db', () => ({ pool: { query: jest.fn() } }));

const { pool } = require('../src/db');
const produtosRepositorio = require('../src/repositorios/produtosRepositorio');

// O filtro do catálogo saiu da memória e virou SQL. Estes testes conferem a
// consulta montada; o comportamento com dados reais foi verificado contra o
// banco (busca sem acento, cada filtro e a contagem da paginação).
describe('produtosRepositorio.listar', () => {
  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function consultaFeita() {
    const [sql, params] = pool.query.mock.calls[0];
    return { sql, params };
  }

  it('sem filtros não monta WHERE', async () => {
    await produtosRepositorio.listar({});
    expect(consultaFeita().sql).not.toContain('WHERE');
  });

  it('busca ignora acento e exige todas as palavras', async () => {
    await produtosRepositorio.listar({ busca: 'arma preta' });

    const { sql, params } = consultaFeita();
    expect(sql).toContain('unaccent');
    // duas palavras = duas condições ILIKE
    expect(sql.match(/ILIKE/g)).toHaveLength(2);
    expect(params).toEqual(['%arma%', '%preta%']);
  });

  it('a busca cobre nome, código, categoria, descrição e status', async () => {
    await produtosRepositorio.listar({ busca: 'x' });

    const { sql } = consultaFeita();
    ['p.nome', 'p.codigo_interno', 'c.nome', 'p.descricao', 'p.status'].forEach((campo) => {
      expect(sql).toContain(campo);
    });
  });

  it('estoque baixo usa o mínimo de cada produto, não um número fixo', async () => {
    await produtosRepositorio.listar({ estoque: 'baixo' });

    const { sql } = consultaFeita();
    expect(sql).toContain('p.quantidade <= p.estoque_minimo');
    expect(sql).toContain('p.quantidade > 0');
  });

  it('zerado e acima de 20 têm condições próprias', async () => {
    await produtosRepositorio.listar({ estoque: 'zerado' });
    expect(consultaFeita().sql).toContain('p.quantidade = 0');

    jest.resetAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
    await produtosRepositorio.listar({ estoque: 'acima' });
    expect(consultaFeita().sql).toContain('p.quantidade > 20');
  });

  it('filtro de imagem trata string vazia como sem imagem', async () => {
    await produtosRepositorio.listar({ imagem: 'sem' });

    const { sql } = consultaFeita();
    expect(sql).toContain('p.url_imagem IS NULL');
    expect(sql).toContain("btrim(p.url_imagem) = ''");
  });

  it('aplica limite e deslocamento quando há paginação', async () => {
    await produtosRepositorio.listar({ porPagina: 25, deslocamento: 50 });

    const { sql, params } = consultaFeita();
    expect(sql).toContain('LIMIT');
    expect(sql).toContain('OFFSET');
    expect(params).toEqual([25, 50]);
  });

  it('traz o total junto das linhas, sem uma segunda consulta', async () => {
    await produtosRepositorio.listar({ porPagina: 10, deslocamento: 0 });

    expect(consultaFeita().sql).toContain('COUNT(*) OVER()');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe('produtosRepositorio.listarAlertasDeEstoque', () => {
  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('não é paginado: o sino precisa da conta certa, não de uma página', async () => {
    await produtosRepositorio.listarAlertasDeEstoque();

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('p.quantidade = 0 OR p.quantidade <= p.estoque_minimo');
    expect(sql).not.toContain('OFFSET');
    expect(sql).toContain('LIMIT 100');
  });
});

// A busca tolerante entra só quando a exata não devolve nada. Estes testes
// conferem a consulta montada; o comportamento com dados reais foi medido
// contra o banco, calibrando o limiar de semelhança.
describe('produtosRepositorio.listar com busca tolerante', () => {
  beforeEach(() => {
    pool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function consultaFeita() {
    const [sql, params] = pool.query.mock.calls[0];
    return { sql, params };
  }

  it('sem tolerância, compara por trecho', async () => {
    await produtosRepositorio.listar({ busca: 'armacao' });

    const { sql, params } = consultaFeita();
    expect(sql).toContain('ILIKE');
    expect(sql).not.toContain('word_similarity');
    expect(params).toContain('%armacao%');
  });

  it('com tolerância, compara por semelhança em vez de trecho', async () => {
    await produtosRepositorio.listar({ busca: 'armasao', tolerante: true });

    const { sql, params } = consultaFeita();
    expect(sql).toContain('word_similarity');
    expect(sql).not.toContain('ILIKE');
    // a palavra vai inteira, sem os sinais de percentual
    expect(params).toContain('armasao');
    expect(params).not.toContain('%armasao%');
  });

  it('a tolerância continua ignorando acentos', async () => {
    await produtosRepositorio.listar({ busca: 'armasao', tolerante: true });
    expect(consultaFeita().sql).toContain('unaccent');
  });

  it('o limiar de semelhança vai como parâmetro, não embutido no texto', async () => {
    await produtosRepositorio.listar({ busca: 'armasao', tolerante: true });

    const { params } = consultaFeita();
    const limiar = params.find((p) => typeof p === 'number' && p > 0 && p < 1);
    expect(limiar).toBeGreaterThan(0.29); // acima do que palavras de outro assunto alcançam
    expect(limiar).toBeLessThan(0.5);     // abaixo do que erros de digitação reais alcançam
  });

  it('cada palavra vira sua própria condição de semelhança', async () => {
    await produtosRepositorio.listar({ busca: 'armasao preta', tolerante: true });

    const { sql } = consultaFeita();
    expect(sql.match(/word_similarity/g)).toHaveLength(2);
    expect(sql).toContain('AND');
  });

  it('a tolerância não afeta os demais filtros', async () => {
    await produtosRepositorio.listar({ busca: 'armasao', status: 'ativo', tolerante: true });

    const { sql, params } = consultaFeita();
    expect(sql).toContain('p.status =');
    expect(params).toContain('ativo');
  });
});
