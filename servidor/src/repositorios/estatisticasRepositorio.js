const { pool } = require('../db');

async function buscarProdutos() {
  const { rows } = await pool.query(
    'SELECT id, quantidade, estoque_minimo, status, categoria_id FROM produtos',
  );
  return rows;
}

async function buscarCategorias() {
  const { rows } = await pool.query('SELECT id, nome FROM categorias');
  return rows;
}

async function buscarSaidas() {
  const { rows } = await pool.query(
    `SELECT s.id, s.quantidade, s.data_saida, p.categoria_id
     FROM saidas s
     JOIN produtos p ON p.id = s.produto_id`,
  );
  return rows;
}

module.exports = { buscarProdutos, buscarCategorias, buscarSaidas };
