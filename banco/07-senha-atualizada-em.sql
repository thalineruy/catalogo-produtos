-- Data da última troca de senha, usada pelo aviso de senha antiga no
-- rodapé do menu. O padrão now() evita que contas já existentes apareçam
-- como se nunca tivessem trocado a senha.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_atualizada_em TIMESTAMPTZ DEFAULT now();
