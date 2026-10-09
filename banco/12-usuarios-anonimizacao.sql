-- Anonimização da conta, para atender a LGPD.
--
-- A lei manda eliminar o dado pessoal quando o tratamento acaba (art. 16),
-- mas o controle de estoque precisa continuar sabendo quem deu cada baixa.
-- A saída é o art. 12: dado anonimizado deixa de ser dado pessoal. A conta
-- perde nome, e-mail e credenciais, e o histórico segue com um autor sem
-- identidade.
--
-- A data marca que a conta foi anonimizada. É irreversível: a partir dela
-- a conta não volta a ser usada, e o e-mail original fica livre para um
-- cadastro novo, caso a pessoa retorne à empresa.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMP;
