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

module.exports = { buscarPorEmail, buscarPorId, listar };
