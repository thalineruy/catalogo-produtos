const { pool } = require('../db');
const logsRepositorio = require('./logsRepositorio');

async function registrarSaida({ produtoId, quantidade, motivo, observacao, usuarioId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: produtoRows } = await client.query(
      'SELECT id, nome, quantidade FROM produtos WHERE id = $1 FOR UPDATE',
      [produtoId],
    );
    const produto = produtoRows[0];

    if (!produto) {
      await client.query('ROLLBACK');
      return { tipo: 'produto_nao_encontrado' };
    }

    if (produto.quantidade < quantidade) {
      await client.query('ROLLBACK');
      return { tipo: 'estoque_insuficiente', disponivel: produto.quantidade };
    }

    await client.query('UPDATE produtos SET quantidade = quantidade - $1 WHERE id = $2', [
      quantidade,
      produtoId,
    ]);

    const { rows: saidaRows } = await client.query(
      `INSERT INTO saidas (produto_id, usuario_id, quantidade, motivo, observacao)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, data_saida`,
      [produtoId, usuarioId, quantidade, motivo, observacao || null],
    );

    const estoqueRestante = produto.quantidade - quantidade;

    await logsRepositorio.registrar(
      {
        usuarioId,
        tipo: 'Saída',
        detalhes: `Saída de ${quantidade} un. de "${produto.nome}" (${motivo}). Estoque restante: ${estoqueRestante}.`,
      },
      client,
    );

    await client.query('COMMIT');

    return {
      tipo: 'sucesso',
      saida: {
        id: saidaRows[0].id,
        produto_id: produtoId,
        produto_nome: produto.nome,
        usuario_id: usuarioId,
        quantidade,
        motivo,
        observacao: observacao || null,
        data_saida: saidaRows[0].data_saida,
        estoque_restante: estoqueRestante,
      },
    };
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

async function listar({ produtoId, categoria, operador, inicio, fim }) {
  const condicoes = [];
  const params = [];

  if (produtoId) {
    params.push(produtoId);
    condicoes.push(`s.produto_id = $${params.length}`);
  }
  if (categoria) {
    params.push(categoria);
    condicoes.push(`c.nome = $${params.length}`);
  }
  if (operador) {
    params.push(operador);
    condicoes.push(`s.usuario_id = $${params.length}`);
  }
  if (inicio) {
    params.push(inicio);
    condicoes.push(`s.data_saida >= $${params.length}`);
  }
  if (fim) {
    params.push(fim);
    condicoes.push(`s.data_saida <= $${params.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT s.id, s.produto_id, p.nome AS produto_nome, c.nome AS categoria_nome,
            s.usuario_id, u.nome AS operador_nome, s.quantidade, s.motivo, s.observacao, s.data_saida
     FROM saidas s
     JOIN produtos p ON p.id = s.produto_id
     JOIN categorias c ON c.id = p.categoria_id
     JOIN usuarios u ON u.id = s.usuario_id
     ${where}
     ORDER BY s.data_saida DESC`,
    params,
  );
  return rows;
}

module.exports = { registrarSaida, listar };
