-- Situação da conta: ativa ou desativada.
--
-- Quem sai da empresa não pode continuar entrando no sistema, mas também
-- não pode simplesmente ser apagado: as saídas de estoque e os registros
-- de atividade apontam para o usuário que os fez, e perder esse vínculo
-- apagaria o histórico de quem mexeu no quê.
--
-- Desativar resolve os dois lados: o acesso é cortado e o histórico
-- continua inteiro. A exclusão fica reservada para contas que nunca
-- chegaram a movimentar nada.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Guarda quando a conta foi desativada, para a tela explicar desde quando
-- a pessoa está sem acesso em vez de só dizer "inativo".
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS desativado_em TIMESTAMP;
