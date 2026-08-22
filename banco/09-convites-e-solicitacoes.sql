-- Convite de acesso: o novo usuário recebe um link de uso único por
-- e-mail e define a própria senha. Guarda o hash do token, nunca o token
-- em si — quem ler o banco não consegue ativar a conta de ninguém.
-- SHA-256 e não bcrypt de propósito: o token é aleatório de 32 bytes, não
-- uma senha adivinhável, e o hash precisa ser determinístico para achar a
-- linha pelo token que chega na URL.
CREATE TABLE IF NOT EXISTS convites_acesso (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_convites_acesso_usuario
  ON convites_acesso (usuario_id);

-- Pedidos de recuperação feitos na tela de entrada. Antes isso virava só
-- uma linha no log de auditoria, que ninguém via: o administrador teria
-- que lembrar de filtrar por "Recuperação". Agora vira uma fila com
-- estado, para dar para saber o que já foi atendido.
--
-- O motivo importa: "Perdi o acesso ao Google Authenticator" e "Troquei
-- de celular" não se resolvem trocando a senha, e sim redefinindo a
-- verificação em duas etapas.
CREATE TABLE IF NOT EXISTS solicitacoes_acesso (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  motivo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atendido_em TIMESTAMPTZ,
  atendido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- A consulta que importa é "o que ainda está pendente, mais recente
-- primeiro".
CREATE INDEX IF NOT EXISTS idx_solicitacoes_acesso_pendentes
  ON solicitacoes_acesso (criado_em DESC) WHERE atendido_em IS NULL;
