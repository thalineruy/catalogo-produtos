-- Adiciona campo de observação opcional às saídas de produtos
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS observacao TEXT;
