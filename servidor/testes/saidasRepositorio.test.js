jest.mock('../src/db', () => ({ pool: { connect: jest.fn(), query: jest.fn() } }));

const { pool } = require('../src/db');
const { criarClienteFalso } = require('./ajudantes/clienteFalso');
const saidasRepositorio = require('../src/repositorios/saidasRepositorio');

describe('registrarSaida', () => {
  it('baixa o estoque na quantidade exata', async () => {
    const cliente = criarClienteFalso(10);
    pool.connect.mockResolvedValue(cliente);

    const resultado = await saidasRepositorio.registrarSaida({
      produtoId: 1,
      quantidade: 4,
      motivo: 'venda em loja',
      usuarioId: 9,
    });

    expect(resultado.tipo).toBe('sucesso');
    expect(resultado.saida.estoque_restante).toBe(6);
    expect(cliente.quantidadeAtual()).toBe(6);
    expect(cliente.query).toHaveBeenCalledWith('COMMIT');
  });

  it('recusa saída acima do disponível e não altera o estoque', async () => {
    const cliente = criarClienteFalso(3);
    pool.connect.mockResolvedValue(cliente);

    const resultado = await saidasRepositorio.registrarSaida({
      produtoId: 1,
      quantidade: 5,
      motivo: 'venda em loja',
      usuarioId: 9,
    });

    expect(resultado.tipo).toBe('estoque_insuficiente');
    expect(resultado.disponivel).toBe(3);
    expect(cliente.quantidadeAtual()).toBe(3);
    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO saidas'), expect.anything());
  });

  it('duas saídas seguidas até o limite funcionam; a terceira falha', async () => {
    const cliente = criarClienteFalso(10);
    pool.connect.mockResolvedValue(cliente);

    const primeira = await saidasRepositorio.registrarSaida({
      produtoId: 1,
      quantidade: 6,
      motivo: 'venda em loja',
      usuarioId: 9,
    });
    const segunda = await saidasRepositorio.registrarSaida({
      produtoId: 1,
      quantidade: 4,
      motivo: 'venda em loja',
      usuarioId: 9,
    });
    const terceira = await saidasRepositorio.registrarSaida({
      produtoId: 1,
      quantidade: 1,
      motivo: 'venda em loja',
      usuarioId: 9,
    });

    expect(primeira.tipo).toBe('sucesso');
    expect(segunda.tipo).toBe('sucesso');
    expect(terceira.tipo).toBe('estoque_insuficiente');
    expect(cliente.quantidadeAtual()).toBe(0);
  });

  it('grava o log de auditoria com o operador informado, dentro da mesma transação', async () => {
    const cliente = criarClienteFalso(10);
    pool.connect.mockResolvedValue(cliente);

    await saidasRepositorio.registrarSaida({
      produtoId: 1,
      quantidade: 2,
      motivo: 'venda em loja',
      usuarioId: 42,
    });

    const chamadaLog = cliente.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO logs'));
    expect(chamadaLog).toBeDefined();
    expect(chamadaLog[1][0]).toBe(42);
    expect(chamadaLog[1][1]).toBe('Saída');
  });
});
