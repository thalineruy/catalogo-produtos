const { pool } = require('../db');

const COLUNAS = 'nome, cnpj, endereco, telefone, email, responsavel, url_logotipo';

async function buscar() {
  const { rows } = await pool.query(`SELECT ${COLUNAS} FROM empresa ORDER BY id LIMIT 1`);
  return rows[0] || null;
}

async function atualizar(dados) {
  const { nome, cnpj, endereco, telefone, email, responsavel } = dados;
  const { rows } = await pool.query(
    `UPDATE empresa
     SET nome = $1, cnpj = $2, endereco = $3, telefone = $4, email = $5, responsavel = $6
     WHERE id = (SELECT id FROM empresa ORDER BY id LIMIT 1)
     RETURNING ${COLUNAS}`,
    [nome, cnpj, endereco || null, telefone || null, email || null, responsavel || null],
  );
  return rows[0] || null;
}

async function atualizarLogotipo(url) {
  const { rows } = await pool.query(
    `UPDATE empresa
     SET url_logotipo = $1
     WHERE id = (SELECT id FROM empresa ORDER BY id LIMIT 1)
     RETURNING ${COLUNAS}`,
    [url],
  );
  return rows[0] || null;
}

module.exports = { buscar, atualizar, atualizarLogotipo };
