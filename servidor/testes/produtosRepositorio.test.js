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
