const { pool } = require('../db');

async function criar({ usuarioId, tokenHash, expiraEm }) {
  await pool.query(
    'INSERT INTO dispositivos_confiaveis (usuario_id, token_hash, expira_em) VALUES ($1, $2, $3)',
    [usuarioId, tokenHash, expiraEm],
  );
}

async function buscarValido({ usuarioId, tokenHash }) {
  const { rows } = await pool.query(
    'SELECT id FROM dispositivos_confiaveis WHERE usuario_id = $1 AND token_hash = $2 AND expira_em > now()',
    [usuarioId, tokenHash],
  );
  return rows[0] || null;
}

async function excluirPorUsuario(usuarioId) {
  await pool.query('DELETE FROM dispositivos_confiaveis WHERE usuario_id = $1', [usuarioId]);
}

module.exports = { criar, buscarValido, excluirPorUsuario };
