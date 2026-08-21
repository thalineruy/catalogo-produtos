const { pool } = require('../db');

async function buscarSaidasParaRelatorio() {
  const { rows } = await pool.query(
    `SELECT s.id, p.nome AS produto_nome, p.codigo_interno, c.nome AS categoria_nome,
            p.quantidade AS estoque_atual, p.estoque_minimo, p.status AS produto_status,
            s.usuario_id, u.nome AS operador_nome,
            s.quantidade, s.motivo, s.data_saida
     FROM saidas s
     JOIN produtos p ON p.id = s.produto_id
     JOIN categorias c ON c.id = p.categoria_id
     JOIN usuarios u ON u.id = s.usuario_id
     ORDER BY s.data_saida DESC`,
  );
  return rows;
}

module.exports = { buscarSaidasParaRelatorio };
