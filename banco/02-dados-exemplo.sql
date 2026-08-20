-- Catálogo de Produtos — Controle de Estoque Empresarial
-- Dados de exemplo
-- Senha de todos os usuários de exemplo: "senha123" (hash bcrypt real)

INSERT INTO categorias (nome) VALUES
  ('Armações'),
  ('Lentes de Contato'),
  ('Óculos de Sol'),
  ('Lentes Oftálmicas'),
  ('Acessórios');

INSERT INTO usuarios (nome, email, senha_hash, nivel) VALUES
  ('Ana Souza', 'ana.souza@oticavisao.com', '$2b$10$XGrLWSmz71L4J3VLm0oCZO0ynuaJ9QVFK7cp0SZD/sYY5T.4gbFSW', 'administrador'),
  ('Carlos Lima', 'carlos.lima@oticavisao.com', '$2b$10$XGrLWSmz71L4J3VLm0oCZO0ynuaJ9QVFK7cp0SZD/sYY5T.4gbFSW', 'administrador'),
  ('Beatriz Alves', 'beatriz.alves@oticavisao.com', '$2b$10$XGrLWSmz71L4J3VLm0oCZO0ynuaJ9QVFK7cp0SZD/sYY5T.4gbFSW', 'operador'),
  ('Diego Ferreira', 'diego.ferreira@oticavisao.com', '$2b$10$XGrLWSmz71L4J3VLm0oCZO0ynuaJ9QVFK7cp0SZD/sYY5T.4gbFSW', 'operador');

INSERT INTO produtos (nome, codigo_interno, categoria_id, descricao, quantidade, estoque_minimo, status, url_imagem) VALUES
  ('Armação Acetato Preta', 'OT-001', (SELECT id FROM categorias WHERE nome = 'Armações'), 'Armação de acetato na cor preta, formato retangular', 25, 5, 'ativo', 'https://exemplo.com/imagens/ot-001.jpg'),
  ('Armação Metal Dourada', 'OT-002', (SELECT id FROM categorias WHERE nome = 'Armações'), 'Armação de metal dourado, formato redondo', 18, 5, 'ativo', 'https://exemplo.com/imagens/ot-002.jpg'),
  ('Armação Infantil Colorida', 'OT-003', (SELECT id FROM categorias WHERE nome = 'Armações'), 'Armação infantil flexível, diversas cores', 3, 5, 'ativo', 'https://exemplo.com/imagens/ot-003.jpg'),
  ('Lente de Contato Mensal', 'OT-004', (SELECT id FROM categorias WHERE nome = 'Lentes de Contato'), 'Lente de contato de troca mensal, caixa com 6 unidades', 40, 10, 'ativo', 'https://exemplo.com/imagens/ot-004.jpg'),
  ('Lente de Contato Diária', 'OT-005', (SELECT id FROM categorias WHERE nome = 'Lentes de Contato'), 'Lente de contato descartável diária, caixa com 30 unidades', 60, 15, 'ativo', 'https://exemplo.com/imagens/ot-005.jpg'),
  ('Lente de Contato Colorida', 'OT-006', (SELECT id FROM categorias WHERE nome = 'Lentes de Contato'), 'Lente de contato colorida sem grau, caixa com 2 unidades', 2, 8, 'ativo', 'https://exemplo.com/imagens/ot-006.jpg'),
  ('Óculos de Sol Polarizado', 'OT-007', (SELECT id FROM categorias WHERE nome = 'Óculos de Sol'), 'Óculos de sol com lente polarizada, proteção UV400', 15, 5, 'ativo', 'https://exemplo.com/imagens/ot-007.jpg'),
  ('Óculos de Sol Infantil', 'OT-008', (SELECT id FROM categorias WHERE nome = 'Óculos de Sol'), 'Óculos de sol infantil, armação flexível', 0, 5, 'ativo', 'https://exemplo.com/imagens/ot-008.jpg'),
  ('Óculos de Sol Esportivo', 'OT-009', (SELECT id FROM categorias WHERE nome = 'Óculos de Sol'), 'Óculos de sol esportivo com haste emborrachada', 10, 3, 'ativo', 'https://exemplo.com/imagens/ot-009.jpg'),
  ('Lente Oftálmica Multifocal', 'OT-010', (SELECT id FROM categorias WHERE nome = 'Lentes Oftálmicas'), 'Lente oftálmica multifocal com antirreflexo', 20, 5, 'ativo', 'https://exemplo.com/imagens/ot-010.jpg'),
  ('Lente Oftálmica Monofocal', 'OT-011', (SELECT id FROM categorias WHERE nome = 'Lentes Oftálmicas'), 'Lente oftálmica monofocal com antirreflexo', 22, 5, 'ativo', 'https://exemplo.com/imagens/ot-011.jpg'),
  ('Estojo para Óculos', 'OT-012', (SELECT id FROM categorias WHERE nome = 'Acessórios'), 'Estojo rígido para armazenamento de óculos', 50, 10, 'ativo', 'https://exemplo.com/imagens/ot-012.jpg');

INSERT INTO saidas (produto_id, usuario_id, quantidade, motivo, data_saida) VALUES
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-001'), (SELECT id FROM usuarios WHERE email = 'beatriz.alves@oticavisao.com'), 2, 'Venda balcão', NOW() - INTERVAL '20 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-002'), (SELECT id FROM usuarios WHERE email = 'diego.ferreira@oticavisao.com'), 1, 'Venda balcão', NOW() - INTERVAL '18 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-003'), (SELECT id FROM usuarios WHERE email = 'beatriz.alves@oticavisao.com'), 4, 'Venda balcão', NOW() - INTERVAL '15 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-004'), (SELECT id FROM usuarios WHERE email = 'diego.ferreira@oticavisao.com'), 6, 'Venda balcão', NOW() - INTERVAL '12 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-005'), (SELECT id FROM usuarios WHERE email = 'beatriz.alves@oticavisao.com'), 10, 'Venda balcão', NOW() - INTERVAL '10 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-006'), (SELECT id FROM usuarios WHERE email = 'diego.ferreira@oticavisao.com'), 6, 'Venda balcão', NOW() - INTERVAL '9 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-007'), (SELECT id FROM usuarios WHERE email = 'beatriz.alves@oticavisao.com'), 3, 'Venda balcão', NOW() - INTERVAL '6 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-008'), (SELECT id FROM usuarios WHERE email = 'diego.ferreira@oticavisao.com'), 5, 'Venda balcão', NOW() - INTERVAL '4 days'),
  ((SELECT id FROM produtos WHERE codigo_interno = 'OT-012'), (SELECT id FROM usuarios WHERE email = 'beatriz.alves@oticavisao.com'), 3, 'Brinde para cliente', NOW() - INTERVAL '2 days');

INSERT INTO logs (usuario_id, acao, detalhes, criado_em) VALUES
  ((SELECT id FROM usuarios WHERE email = 'ana.souza@oticavisao.com'), 'login', 'Login realizado com sucesso', NOW() - INTERVAL '20 days'),
  ((SELECT id FROM usuarios WHERE email = 'ana.souza@oticavisao.com'), 'cadastro_produto', 'Cadastrou o produto OT-001', NOW() - INTERVAL '20 days'),
  ((SELECT id FROM usuarios WHERE email = 'beatriz.alves@oticavisao.com'), 'login', 'Login realizado com sucesso', NOW() - INTERVAL '15 days'),
  ((SELECT id FROM usuarios WHERE email = 'beatriz.alves@oticavisao.com'), 'registro_saida', 'Registrou saída do produto OT-003', NOW() - INTERVAL '15 days'),
  ((SELECT id FROM usuarios WHERE email = 'carlos.lima@oticavisao.com'), 'login', 'Login realizado com sucesso', NOW() - INTERVAL '9 days'),
  ((SELECT id FROM usuarios WHERE email = 'diego.ferreira@oticavisao.com'), 'registro_saida', 'Registrou saída do produto OT-008, estoque zerado', NOW() - INTERVAL '4 days');
