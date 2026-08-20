-- Catálogo de Produtos — Controle de Estoque Empresarial
-- Estrutura de tabelas (PostgreSQL / Supabase)

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  codigo_interno VARCHAR(30) NOT NULL UNIQUE,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  estoque_minimo INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  status VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  url_imagem TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('administrador', 'operador')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE saidas (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  motivo VARCHAR(200),
  data_saida TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  acao VARCHAR(100) NOT NULL,
  detalhes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
