jest.mock('../src/db', () => ({ pool: { connect: jest.fn(), query: jest.fn() } }));

const { pool } = require('../src/db');
const solicitacoesRepositorio = require('../src/repositorios/solicitacoesRepositorio');

function criarCliente({ pedidoExiste = true } = {}) {
  const comandos = [];
  return {
    comandos,
    release: jest.fn(),
    query: jest.fn(async (texto) => {
      comandos.push(texto);
      if (texto.includes('SELECT email, anonimizado_em')) {
        return pedidoExiste ? { rows: [{ email: 'jose@octati.com.br', anonimizado_em: null }] } : { rows: [] };
      }
      if (texto.includes('UPDATE solicitacoes_acesso')) return { rowCount: 2 };
      if (texto.includes('UPDATE logs')) return { rowCount: 3 };
      return { rows: [], rowCount: 0 };
    }),
  };
}

describe('anonimizar pedido de acesso', () => {
  afterEach(() => jest.clearAllMocks());

  // Quem tentou entrar três vezes deixou o e-mail três vezes
  it('limpa todos os pedidos daquele endereço, não só o escolhido', async () => {
    const cliente = criarCliente();
    pool.connect.mockResolvedValue(cliente);

    const resultado = await solicitacoesRepositorio.anonimizar(4, {
      emailAnonimo: 'anonimizado@removido.invalid',
    });

    const limpeza = cliente.query.mock.calls.find((c) => c[0].includes('UPDATE solicitacoes_acesso'));
    expect(limpeza[0]).toMatch(/lower\(email\) = lower\(\$2\)/);
    expect(limpeza[0]).not.toMatch(/WHERE id =/);
    expect(limpeza[1]).toEqual(['anonimizado@removido.invalid', 'jose@octati.com.br']);
    expect(resultado.pedidosAnonimizados).toBe(2);
  });

  it('troca o e-mail no texto do histórico', async () => {
    const cliente = criarCliente();
    pool.connect.mockResolvedValue(cliente);

    const resultado = await solicitacoesRepositorio.anonimizar(4, {
      emailAnonimo: 'anonimizado@removido.invalid',
    });

    const limpeza = cliente.query.mock.calls.find((c) => c[0].includes('UPDATE logs'));
    expect(limpeza[1]).toEqual(['jose@octati.com.br']);
    expect(resultado.registrosLimpos).toBe(3);
    expect(cliente.query).toHaveBeenCalledWith('COMMIT');
  });

  // O motivo vem de uma lista de três opções e não identifica ninguém
  it('não apaga o motivo do pedido', async () => {
    const cliente = criarCliente();
    pool.connect.mockResolvedValue(cliente);

    await solicitacoesRepositorio.anonimizar(4, { emailAnonimo: 'anonimizado@removido.invalid' });

    expect(cliente.comandos.some((texto) => /SET[\s\S]*motivo/.test(texto))).toBe(false);
  });

  it('desfaz tudo quando a limpeza do histórico falha', async () => {
    const cliente = criarCliente();
    cliente.query.mockImplementation(async (texto) => {
      if (texto.includes('SELECT email, anonimizado_em')) {
        return { rows: [{ email: 'jose@octati.com.br', anonimizado_em: null }] };
      }
      if (texto.includes('UPDATE logs')) throw new Error('falha no banco');
      return { rows: [], rowCount: 0 };
    });
    pool.connect.mockResolvedValue(cliente);

    await expect(
      solicitacoesRepositorio.anonimizar(4, { emailAnonimo: 'anonimizado@removido.invalid' }),
    ).rejects.toThrow('falha no banco');

    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.query).not.toHaveBeenCalledWith('COMMIT');
    expect(cliente.release).toHaveBeenCalled();
  });

  it('não faz nada quando o pedido não existe', async () => {
    const cliente = criarCliente({ pedidoExiste: false });
    pool.connect.mockResolvedValue(cliente);

    const resultado = await solicitacoesRepositorio.anonimizar(99, {
      emailAnonimo: 'anonimizado@removido.invalid',
    });

    expect(resultado).toBeNull();
    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    // "FOR UPDATE" do SELECT não conta: o que não pode acontecer é
    // escrita em tabela nenhuma.
    expect(cliente.comandos.some((texto) => /^\s*UPDATE /.test(texto))).toBe(false);
  });
});
