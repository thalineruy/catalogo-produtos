const { pool } = require('../db');

async function buscarPorEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, nome, email, senha_hash, nivel, totp_secret, totp_confirmado_em FROM usuarios WHERE email = $1',
    [email],
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT id, nome, email, nivel, totp_secret, totp_confirmado_em, senha_atualizada_em
     FROM usuarios WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

// Só para conferir a senha atual na troca feita pelo próprio usuário
async function buscarPorIdComSenha(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, email, senha_hash FROM usuarios WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

async function listar() {
  const { rows } = await pool.query(
    `SELECT id, nome, email, nivel, ultimo_acesso, (totp_confirmado_em IS NOT NULL) AS totp_ativo
     FROM usuarios ORDER BY nome`,
  );
  return rows;
}

async function registrarAcesso(id) {
  await pool.query('UPDATE usuarios SET ultimo_acesso = now() WHERE id = $1', [id]);
}

// Destinatários do aviso de pedido de acesso.
async function listarEmailsDeAdministradores() {
  const { rows } = await pool.query(
    "SELECT nome, email FROM usuarios WHERE nivel = 'administrador' ORDER BY id",
  );
  return rows;
}

async function criar({ nome, email, nivel, senhaHash }) {
  const { rows } = await pool.query(
    'INSERT INTO usuarios (nome, email, senha_hash, nivel) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, nivel',
    [nome, email, senhaHash, nivel],
  );
  return rows[0];
}

async function atualizarNivel(id, nivel) {
  const { rows } = await pool.query(
    'UPDATE usuarios SET nivel = $1 WHERE id = $2 RETURNING id, nome, email, nivel',
    [nivel, id],
  );
  return rows[0] || null;
}

// Marca a data da troca junto: é ela que alimenta o aviso de senha antiga
async function atualizarSenha(id, senhaHash) {
  await pool.query('UPDATE usuarios SET senha_hash = $1, senha_atualizada_em = now() WHERE id = $2', [
    senhaHash,
    id,
  ]);
}

async function excluir(id) {
  await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
}

async function salvarTotpSecret(id, secret) {
  await pool.query('UPDATE usuarios SET totp_secret = $1 WHERE id = $2', [secret, id]);
}

async function confirmarTotp(id) {
  await pool.query('UPDATE usuarios SET totp_confirmado_em = now() WHERE id = $1', [id]);
}

async function limparTotp(id) {
  await pool.query('UPDATE usuarios SET totp_secret = NULL, totp_confirmado_em = NULL WHERE id = $1', [id]);
}

module.exports = {
  listarEmailsDeAdministradores,
  buscarPorEmail,
  buscarPorId,
  buscarPorIdComSenha,
  listar,
  criar,
  atualizarNivel,
  atualizarSenha,
  excluir,
  salvarTotpSecret,
  confirmarTotp,
  limparTotp,
  registrarAcesso,
};
