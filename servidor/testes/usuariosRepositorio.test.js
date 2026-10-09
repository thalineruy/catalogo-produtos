// O repositório de usuários entra dublado por padrão (ver ajudantes/
// preparar.js), porque toda rota autenticada consulta a situação da
// conta. Aqui quem está sob teste é ele mesmo, então vale o módulo real.
jest.mock('../src/db', () => ({ pool: { connect: jest.fn(), query: jest.fn() } }));

const { pool } = require('../src/db');
const usuariosRepositorio = jest.requireActual('../src/repositorios/usuariosRepositorio');

function criarCliente({ usuarioExiste = true } = {}) {
  const comandos = [];
  return {
    comandos,
    release: jest.fn(),
    query: jest.fn(async (texto, params) => {
      comandos.push({ texto, params });
      if (texto.includes('SELECT nome, email FROM usuarios')) {
        return usuarioExiste
          ? { rows: [{ nome: 'Carlos Henrique', email: 'carlos@otica.com.br' }] }
          : { rows: [] };
      }
      if (texto.includes('UPDATE logs')) return { rowCount: 4 };
      return { rows: [], rowCount: 0 };
    }),
  };
}

const dadosAnonimos = {
  id: 5,
  senhaHash: 'hash-aleatorio',
  nomeAnonimo: 'Usuário anonimizado',
  emailAnonimo: 'anonimizado-5@removido.invalid',
};

describe('anonimizar', () => {
  afterEach(() => jest.clearAllMocks());

  it('apaga a identificação da conta e as credenciais, mantendo a linha', async () => {
    const cliente = criarCliente();
    pool.connect.mockResolvedValue(cliente);

    await usuariosRepositorio.anonimizar(dadosAnonimos);

    const atualizacao = cliente.comandos.find((c) => c.texto.includes('UPDATE usuarios'));
    expect(atualizacao.texto).toMatch(/totp_secret = NULL/);
    expect(atualizacao.texto).toMatch(/ativo = FALSE/);
    expect(atualizacao.texto).toMatch(/anonimizado_em = now\(\)/);
    expect(atualizacao.params).toEqual([
      'Usuário anonimizado',
      'anonimizado-5@removido.invalid',
      'hash-aleatorio',
      5,
    ]);
    expect(cliente.comandos.some((c) => c.texto.includes('DELETE FROM dispositivos_confiaveis'))).toBe(true);
    expect(cliente.comandos.some((c) => c.texto.includes('DELETE FROM convites_acesso'))).toBe(true);
    expect(cliente.query).toHaveBeenCalledWith('COMMIT');
  });

  // Sem isto a anonimização seria de fachada: o nome continuaria escrito
  // no texto dos registros, inclusive nos feitos por outras pessoas.
  it('troca o nome e o e-mail no texto de todo o histórico', async () => {
    const cliente = criarCliente();
    pool.connect.mockResolvedValue(cliente);

    const resultado = await usuariosRepositorio.anonimizar(dadosAnonimos);

    const limpeza = cliente.comandos.find((c) => c.texto.includes('UPDATE logs'));
    expect(limpeza.params).toEqual([
      'Carlos Henrique',
      'Usuário anonimizado',
      'carlos@otica.com.br',
      'anonimizado-5@removido.invalid',
    ]);
    // Sem filtro por usuario_id: o nome aparece em registros de terceiros
    expect(limpeza.texto).not.toMatch(/usuario_id/);
    expect(resultado.registrosLimpos).toBe(4);
  });

  it('também remove o e-mail da fila de pedidos de acesso', async () => {
    const cliente = criarCliente();
    pool.connect.mockResolvedValue(cliente);

    await usuariosRepositorio.anonimizar(dadosAnonimos);

    const pedidos = cliente.comandos.find((c) => c.texto.includes('solicitacoes_acesso'));
    expect(pedidos.params).toEqual(['anonimizado-5@removido.invalid', 'carlos@otica.com.br']);
  });

  it('desfaz tudo quando um dos passos falha', async () => {
    const cliente = criarCliente();
    cliente.query.mockImplementation(async (texto) => {
      if (texto.includes('SELECT nome, email FROM usuarios')) {
        return { rows: [{ nome: 'Carlos Henrique', email: 'carlos@otica.com.br' }] };
      }
      if (texto.includes('UPDATE logs')) throw new Error('falha no banco');
      return { rows: [], rowCount: 0 };
    });
    pool.connect.mockResolvedValue(cliente);

    await expect(usuariosRepositorio.anonimizar(dadosAnonimos)).rejects.toThrow('falha no banco');

    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.query).not.toHaveBeenCalledWith('COMMIT');
    expect(cliente.release).toHaveBeenCalled();
  });

  it('não faz nada quando a conta não existe mais', async () => {
    const cliente = criarCliente({ usuarioExiste: false });
    pool.connect.mockResolvedValue(cliente);

    const resultado = await usuariosRepositorio.anonimizar(dadosAnonimos);

    expect(resultado).toBeNull();
    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.comandos.some((c) => c.texto.includes('UPDATE usuarios'))).toBe(false);
  });
});
