const { pool } = require('../db');

const TIPOS_VALIDOS = ['Cadastro', 'Edição', 'Exclusão', 'Saída', 'Acesso', 'Relatório', 'Recuperação'];

async function registrar({ usuarioId, tipo, detalhes }, executor = pool) {
  await executor.query(
    'INSERT INTO logs (usuario_id, acao, detalhes) VALUES ($1, $2, $3)',
    [usuarioId, tipo, detalhes || null],
  );
}

async function listar({
  usuarioIdSolicitante,
  nivelSolicitante,
  operador,
  tipo,
  inicio,
  fim,
  porPagina,
  deslocamento,
}) {
  const condicoes = [];
  const params = [];

  if (nivelSolicitante !== 'administrador') {
    params.push(usuarioIdSolicitante);
    condicoes.push(`l.usuario_id = $${params.length}`);
  } else if (operador) {
    params.push(operador);
    condicoes.push(`l.usuario_id = $${params.length}`);
  }

  if (tipo) {
    params.push(tipo);
    condicoes.push(`l.acao = $${params.length}`);
  }
  if (inicio) {
    params.push(inicio);
    condicoes.push(`l.criado_em >= $${params.length}`);
  }
  if (fim) {
    params.push(fim);
    // "até 21/08" precisa incluir o dia 21 inteiro. Comparar direto com a
    // data equivale à meia-noite e deixaria de fora tudo o que aconteceu
    // naquele dia.
    condicoes.push(`l.criado_em < ($${params.length}::date + interval '1 day')`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  // COUNT(*) OVER() traz o total de registros do filtro junto das linhas
  // da página, sem precisar de uma segunda consulta ao banco.
  params.push(porPagina, deslocamento);
  const limite = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await pool.query(
    `SELECT l.id, l.usuario_id, u.nome AS operador_nome, l.acao AS tipo, l.detalhes, l.criado_em,
            COUNT(*) OVER() AS total_geral
     FROM logs l
     LEFT JOIN usuarios u ON u.id = l.usuario_id
     ${where}
     ORDER BY l.criado_em DESC
     ${limite}`,
    params,
  );
  return rows;
}

module.exports = { registrar, listar, TIPOS_VALIDOS };
