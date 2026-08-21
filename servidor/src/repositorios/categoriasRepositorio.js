const { pool } = require('../db');

async function listar() {
  const { rows } = await pool.query(
    `SELECT c.id, c.nome, COUNT(p.id)::int AS total_produtos
     FROM categorias c
     LEFT JOIN produtos p ON p.categoria_id = c.id
     GROUP BY c.id, c.nome
     ORDER BY c.nome`,
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query('SELECT id, nome FROM categorias WHERE id = $1', [id]);
  return rows[0] || null;
}

async function buscarPorNome(nome, ignorarId = null) {
  const params = [nome];
  let sql = 'SELECT id FROM categorias WHERE nome = $1';
  if (ignorarId) {
    sql += ' AND id <> $2';
    params.push(ignorarId);
  }
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function criar(nome) {
  const { rows } = await pool.query(
    'INSERT INTO categorias (nome) VALUES ($1) RETURNING id, nome',
    [nome],
  );
  return rows[0];
}

async function atualizar(id, nome) {
  const { rows } = await pool.query(
    'UPDATE categorias SET nome = $1 WHERE id = $2 RETURNING id, nome',
    [nome, id],
  );
  return rows[0] || null;
}

async function contarProdutosVinculados(id) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM produtos WHERE categoria_id = $1',
    [id],
  );
  return rows[0].total;
}

async function excluir(id) {
  await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorNome,
  criar,
  atualizar,
  contarProdutosVinculados,
  excluir,
};
