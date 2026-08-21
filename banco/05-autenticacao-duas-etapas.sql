-- Verificação em duas etapas (TOTP) e dispositivos confiáveis.
-- O segredo TOTP fica no banco; o código de seis dígitos, não: ele é
-- gerado no celular do usuário e só é conferido no momento do acesso.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS totp_confirmado_em TIMESTAMPTZ;

-- "Confiar neste computador por 30 dias". Guarda o hash do token, nunca
-- o token em si: quem ler o banco não consegue se passar pelo aparelho.
CREATE TABLE IF NOT EXISTS dispositivos_confiaveis (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_confiaveis_usuario
  ON dispositivos_confiaveis (usuario_id);
