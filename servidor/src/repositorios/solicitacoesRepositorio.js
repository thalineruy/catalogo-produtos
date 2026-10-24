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
    `SELECT s.id, s.email, s.motivo, s.criado_em, s.atendido_em, s.anonimizado_em,
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

async function buscarPorId(id, executor = pool) {
  const { rows } = await executor.query(
    'SELECT id, email, motivo, criado_em, atendido_em, anonimizado_em FROM solicitacoes_acesso WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

/* Apaga o e-mail de quem pediu acesso, aqui e no histórico.

   Limpa todos os pedidos daquele endereço, não só o escolhido: quem
   tentou entrar três vezes deixou o e-mail três vezes, e apagar um só
   não eliminaria o dado. Pela mesma razão a varredura do histórico não
   filtra por pedido.

   O motivo fica: vem de uma lista de três opções e não identifica
   ninguém. Sem ele o registro perderia o pouco que ainda informa. */
async function anonimizar(id, { emailAnonimo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT email, anonimizado_em FROM solicitacoes_acesso WHERE id = $1 FOR UPDATE',
      [id],
    );
    const pedido = rows[0];
    if (!pedido) {
      await client.query('ROLLBACK');
      return null;
    }

    const { rowCount: pedidosAnonimizados } = await client.query(
      `UPDATE solicitacoes_acesso
          SET email = $1, anonimizado_em = now()
        WHERE lower(email) = lower($2) AND anonimizado_em IS NULL`,
      [emailAnonimo, pedido.email],
    );

    const { rowCount: registrosLimpos } = await client.query(
      `UPDATE logs
          SET detalhes = replace(detalhes, $1, 'e-mail removido')
        WHERE detalhes LIKE '%' || $1 || '%'`,
      [pedido.email],
    );

    await client.query('COMMIT');
    return { pedidosAnonimizados, registrosLimpos };
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

module.exports = { registrar, listar, contarPendentes, marcarAtendida, buscarPorId, anonimizar };
