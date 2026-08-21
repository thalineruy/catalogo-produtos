-- Data do último login, exibida na tabela de usuários da Administração
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ;

-- Sigla da marca (até 3 letras). Vira o logotipo de reserva enquanto a
-- empresa não envia uma imagem própria.
ALTER TABLE empresa ADD COLUMN IF NOT EXISTS sigla TEXT;
