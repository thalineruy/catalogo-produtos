-- Anonimização dos pedidos de acesso.
--
-- Quem pede acesso na tela de entrada informa o e-mail antes de ter
-- qualquer conta. É dado pessoal de alguém que talvez nunca venha a ser
-- usuário, e a anonimização da tela de usuários não alcança esses
-- pedidos — eles vivem noutra tabela.
--
-- O motivo do pedido não é apagado junto: ele vem de uma lista de três
-- opções e não identifica ninguém. Mantê-lo preserva o que o registro
-- tem de útil ("houve um pedido de troca de senha nesta data").

ALTER TABLE solicitacoes_acesso ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMP;
