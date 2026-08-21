function criarClienteFalso(estoqueInicial, nomeProduto = 'Produto Teste') {
  let quantidade = estoqueInicial;
  let proximoIdSaida = 1;

  const client = {
    query: jest.fn(async (sql, params = []) => {
      const comando = sql.trim().split(/\s+/)[0].toUpperCase();

      if (comando === 'BEGIN' || comando === 'COMMIT' || comando === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM produtos') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: params[0], nome: nomeProduto, quantidade }] };
      }
      if (sql.includes('UPDATE produtos SET quantidade')) {
        quantidade -= params[0];
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO saidas')) {
        return { rows: [{ id: proximoIdSaida++, data_saida: new Date('2026-01-01T10:00:00Z') }] };
      }
      if (sql.includes('INSERT INTO logs')) {
        return { rows: [] };
      }

      throw new Error(`SQL não mapeado no cliente falso: ${sql}`);
    }),
    release: jest.fn(),
    quantidadeAtual: () => quantidade,
  };

  return client;
}

module.exports = { criarClienteFalso };
