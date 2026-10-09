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
            ativo, desativado_em, anonimizado_em
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
            u.anonimizado_em,
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

/* Anonimização: apaga quem a pessoa era, preserva o que a conta fez.

   Tudo numa transação só. Pela metade, o pior caso seria a conta sem
   nome e o histórico ainda com ele escrito — exatamente o que a
   anonimização existe para evitar.

   A varredura do histórico é a parte que costuma ser esquecida. O nome do
   operador na tela vem de uma junção com esta tabela e se resolve
   sozinho, mas o texto de cada registro traz o nome por extenso, às vezes
   em registros feitos por outras pessoas ("Desativou o usuário Fulano").
   Sem trocar esses textos, a anonimização seria de fachada. */
async function anonimizar({ id, senhaHash, nomeAnonimo, emailAnonimo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT nome, email FROM usuarios WHERE id = $1 FOR UPDATE',
      [id],
    );
    const anterior = rows[0];
    if (!anterior) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE usuarios
          SET nome = $1, email = $2, senha_hash = $3,
              totp_secret = NULL, totp_confirmado_em = NULL,
              ativo = FALSE, anonimizado_em = now()
        WHERE id = $4`,
      [nomeAnonimo, emailAnonimo, senhaHash, id],
    );

    // Credenciais que ainda permitiriam entrar ou receber um link novo
    await client.query('DELETE FROM dispositivos_confiaveis WHERE usuario_id = $1', [id]);
    await client.query('DELETE FROM convites_acesso WHERE usuario_id = $1', [id]);

    // O pedido de acesso guarda o e-mail digitado na tela de entrada
    await client.query(
      "UPDATE solicitacoes_acesso SET email = $1 WHERE lower(email) = lower($2)",
      [emailAnonimo, anterior.email],
    );

    // replace() exato, e não um apagamento por aproximação: troca o nome
    // e o e-mail onde eles aparecem e deixa o resto do registro intacto,
    // para o histórico continuar dizendo o que aconteceu.
    const { rowCount: registrosLimpos } = await client.query(
      `UPDATE logs
          SET detalhes = replace(replace(detalhes, $1, $2), $3, $4)
        WHERE detalhes LIKE '%' || $1 || '%' OR detalhes LIKE '%' || $3 || '%'`,
      [anterior.nome, nomeAnonimo, anterior.email, emailAnonimo],
    );

    await client.query('COMMIT');
    return { registrosLimpos };
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
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
  anonimizar,
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
