const { pool } = require('../db');

async function buscarPorEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, nome, email, senha_hash, nivel, totp_secret, totp_confirmado_em, ativo
     FROM usuarios WHERE email = $1`,
    [email],
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT id, nome, email, nivel, totp_secret, totp_confirmado_em, senha_atualizada_em,
            ativo, desativado_em
     FROM usuarios WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

// Consulta enxuta usada em toda chamada autenticada: é ela que corta o
// acesso de quem foi desativado no meio do expediente, sem esperar a
// sessão vencer. Devolve null quando a conta não existe mais.
async function situacaoDaConta(id) {
  const { rows } = await pool.query('SELECT ativo FROM usuarios WHERE id = $1', [id]);
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

// "tem_historico" diz se a conta já movimentou estoque ou deixou registro
// de atividade. A tela usa isso para oferecer exclusão só a quem nunca
// mexeu em nada — nos demais casos a exclusão é recusada pelo banco, que
// não deixa um registro histórico ficar sem autor.
async function listar() {
  const { rows } = await pool.query(
    `SELECT u.id, u.nome, u.email, u.nivel, u.ultimo_acesso, u.ativo, u.desativado_em,
            (u.totp_confirmado_em IS NOT NULL) AS totp_ativo,
            (EXISTS (SELECT 1 FROM saidas s WHERE s.usuario_id = u.id)
             OR EXISTS (SELECT 1 FROM logs l WHERE l.usuario_id = u.id)) AS tem_historico
     FROM usuarios u ORDER BY u.nome`,
  );
  return rows;
}

// Impede que a última conta de administrador ativa seja desativada ou
// excluída: sem nenhum administrador, ninguém mais consegue cadastrar
// usuários, e o sistema só voltaria por intervenção direta no banco.
async function contarAdministradoresAtivos() {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS total FROM usuarios WHERE nivel = 'administrador' AND ativo = TRUE",
  );
  return rows[0].total;
}

async function registrarAcesso(id) {
  await pool.query('UPDATE usuarios SET ultimo_acesso = now() WHERE id = $1', [id]);
}

// Destinatários do aviso de pedido de acesso. Conta desativada fica de
// fora: quem não usa mais o sistema não precisa receber os pedidos.
async function listarEmailsDeAdministradores() {
  const { rows } = await pool.query(
    "SELECT nome, email FROM usuarios WHERE nivel = 'administrador' AND ativo = TRUE ORDER BY id",
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

// A data só é gravada ao desativar; ao reativar ela volta a ficar vazia,
// para a tela não mostrar uma desativação que já foi desfeita.
async function definirSituacao(id, ativo) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET ativo = $1, desativado_em = CASE WHEN $1 THEN NULL ELSE now() END
     WHERE id = $2
     RETURNING id, nome, email, nivel, ativo, desativado_em`,
    [ativo, id],
  );
  return rows[0] || null;
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
  situacaoDaConta,
  contarAdministradoresAtivos,
  definirSituacao,
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
