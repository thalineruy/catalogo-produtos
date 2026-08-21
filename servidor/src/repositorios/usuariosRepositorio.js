const { pool } = require('../db');

async function buscarPorEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, nome, email, senha_hash, nivel FROM usuarios WHERE email = $1',
    [email],
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, email, nivel FROM usuarios WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

async function listar() {
  const { rows } = await pool.query('SELECT id, nome, email, nivel FROM usuarios ORDER BY nome');
  return rows;
}

async function criar({ nome, email, nivel, senhaHash }) {
  const { rows } = await pool.query(
    'INSERT INTO usuarios (nome, email, senha_hash, nivel) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, nivel',
    [nome, email, senhaHash, nivel],
  );
  return rows[0];
}

async function atualizarNivel(id, nivel) {
  const { rows } = await pool.query(
    'UPDATE usuarios SET nivel = $1 WHERE id = $2 RETURNING id, nome, email, nivel',
    [nivel, id],
  );
  return rows[0] || null;
}

async function atualizarSenha(id, senhaHash) {
  await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, id]);
}

async function excluir(id) {
  await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  listar,
  criar,
  atualizarNivel,
  atualizarSenha,
  excluir,
};
