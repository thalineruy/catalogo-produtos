-- Permite buscar "armacao" e encontrar "Armação" direto no banco.
-- Antes o servidor trazia todos os produtos e filtrava na memória; com
-- isto o filtro e a paginação passam a acontecer em SQL.
CREATE EXTENSION IF NOT EXISTS unaccent;
