const { pool } = require('../db');

async function registrar({ email, motivo }, executor = pool) {
  const { rows } = await executor.query(
    'INSERT INTO solicitacoes_acesso (email, motivo) VALUES ($1, $2) RETURNING id, criado_em',
    [email, motivo],
  );
  return rows[0];
}

// Pendentes primeiro e mais recentes no topo. As atendidas continuam na
// lista para dar rastro do que foi feito, mas descem.
async function listar({ porPagina, deslocamento }, executor = pool) {
  const { rows } = await executor.query(
    `SELECT s.id, s.email, s.motivo, s.criado_em, s.atendido_em,
            u.nome AS atendido_por_nome,
            COUNT(*) OVER() AS total_geral
       FROM solicitacoes_acesso s
       LEFT JOIN usuarios u ON u.id = s.atendido_por
      ORDER BY (s.atendido_em IS NULL) DESC, s.criado_em DESC
      LIMIT $1 OFFSET $2`,
    [porPagina, deslocamento],
  );
  return rows;
}

async function contarPendentes(executor = pool) {
  const { rows } = await executor.query(
    'SELECT COUNT(*)::int AS total FROM solicitacoes_acesso WHERE atendido_em IS NULL',
  );
  return rows[0].total;
}

async function marcarAtendida(id, usuarioId, executor = pool) {
  const { rows } = await executor.query(
    `UPDATE solicitacoes_acesso
        SET atendido_em = now(), atendido_por = $2
      WHERE id = $1 AND atendido_em IS NULL
      RETURNING id, email, motivo, atendido_em`,
    [id, usuarioId],
  );
  return rows[0] || null;
}

module.exports = { registrar, listar, contarPendentes, marcarAtendida };
