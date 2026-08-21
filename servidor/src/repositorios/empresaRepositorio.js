const { pool } = require('../db');

async function buscar() {
  const { rows } = await pool.query(
    'SELECT nome, cnpj, endereco, telefone, email, responsavel, url_logotipo FROM empresa ORDER BY id LIMIT 1',
  );
  return rows[0] || null;
}

module.exports = { buscar };
