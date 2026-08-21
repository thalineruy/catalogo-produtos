const { pool } = require('../db');

const SELECT_BASE = `
  SELECT p.id, p.nome, p.codigo_interno, p.categoria_id, c.nome AS categoria_nome,
         p.descricao, p.quantidade, p.estoque_minimo, p.status, p.url_imagem, p.criado_em
  FROM produtos p
  JOIN categorias c ON c.id = p.categoria_id
`;

async function listar() {
  const { rows } = await pool.query(`${SELECT_BASE} ORDER BY p.nome`);
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

async function buscarPorCodigo(codigoInterno, ignorarId = null) {
  const params = [codigoInterno];
  let sql = 'SELECT id FROM produtos WHERE codigo_interno = $1';
  if (ignorarId) {
    sql += ' AND id <> $2';
    params.push(ignorarId);
  }
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function criar(dados) {
  const { nome, codigo_interno, categoria_id, descricao, quantidade, estoque_minimo, status, url_imagem } = dados;
  const { rows } = await pool.query(
    `INSERT INTO produtos (nome, codigo_interno, categoria_id, descricao, quantidade, estoque_minimo, status, url_imagem)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      nome,
      codigo_interno,
      categoria_id,
      descricao || null,
      quantidade ?? 0,
      estoque_minimo ?? 0,
      status || 'ativo',
      url_imagem || null,
    ],
  );
  return buscarPorId(rows[0].id);
}

async function atualizar(id, dados) {
  const { nome, codigo_interno, categoria_id, descricao, quantidade, estoque_minimo, status, url_imagem } = dados;
  await pool.query(
    `UPDATE produtos
     SET nome = $1, codigo_interno = $2, categoria_id = $3, descricao = $4,
         quantidade = $5, estoque_minimo = $6, status = $7, url_imagem = $8
     WHERE id = $9`,
    [
      nome,
      codigo_interno,
      categoria_id,
      descricao || null,
      quantidade ?? 0,
      estoque_minimo ?? 0,
      status || 'ativo',
      url_imagem || null,
      id,
    ],
  );
  return buscarPorId(id);
}

async function excluir(id) {
  await pool.query('DELETE FROM produtos WHERE id = $1', [id]);
}

module.exports = { listar, buscarPorId, buscarPorCodigo, criar, atualizar, excluir };
