const { pool } = require('../db');

async function criar({ usuarioId, tokenHash, expiraEm }, executor = pool) {
  const { rows } = await executor.query(
    `INSERT INTO convites_acesso (usuario_id, token_hash, expira_em)
     VALUES ($1, $2, $3)
     RETURNING id, usuario_id, expira_em`,
    [usuarioId, tokenHash, expiraEm],
  );
  return rows[0];
}

// Invalida os convites anteriores da pessoa antes de emitir outro: dois
// links válidos ao mesmo tempo dobrariam a superfície de ataque sem
// nenhum ganho.
async function invalidarDoUsuario(usuarioId, executor = pool) {
  await executor.query(
    `UPDATE convites_acesso SET usado_em = now()
     WHERE usuario_id = $1 AND usado_em IS NULL`,
    [usuarioId],
  );
}

async function buscarPorTokenHash(tokenHash, executor = pool) {
  const { rows } = await executor.query(
    `SELECT c.id, c.usuario_id, c.expira_em, c.usado_em,
            u.nome AS usuario_nome, u.email AS usuario_email
       FROM convites_acesso c
       JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.token_hash = $1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function marcarUsado(id, executor = pool) {
  await executor.query('UPDATE convites_acesso SET usado_em = now() WHERE id = $1', [id]);
}

module.exports = { criar, invalidarDoUsuario, buscarPorTokenHash, marcarUsado };
