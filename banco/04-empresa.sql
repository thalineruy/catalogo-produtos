-- Dados cadastrais da empresa, usados no cabeçalho dos relatórios
CREATE TABLE IF NOT EXISTS empresa (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  cnpj VARCHAR(20) NOT NULL,
  endereco VARCHAR(250),
  telefone VARCHAR(30),
  email VARCHAR(150),
  responsavel VARCHAR(150),
  url_logotipo TEXT
);

INSERT INTO empresa (nome, cnpj, endereco, telefone, email, responsavel, url_logotipo)
SELECT 'Ótica Visão', '12.345.678/0001-90', 'Rua das Óticas, 123 - Centro, Cidade - UF', '(11) 1234-5678', 'contato@oticavisao.com', 'Ana Souza', NULL
WHERE NOT EXISTS (SELECT 1 FROM empresa);
