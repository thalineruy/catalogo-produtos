# Catálogo de Produtos — Controle de Estoque Empresarial

Sistema para cadastro e controle de estoque de produtos, com registro de saídas e níveis de acesso por usuário.
Projeto Integrador II.

## Como rodar localmente

1. Instale as dependências do servidor:
   ```bash
   cd servidor
   npm install
   ```
2. Copie `.env.example` para `.env` dentro de `servidor/` e preencha os valores (conexão com o Supabase, segredo do JWT etc).
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Abra os arquivos da pasta `telas/` em um navegador (ou sirva com uma extensão tipo Live Server). O `config.js` aponta para `http://localhost:3000`.

## Como recriar o banco

1. Crie um projeto no Supabase e copie a `DATABASE_URL` para o `.env`.
2. Execute os scripts na pasta `banco/`, em ordem, no editor SQL do Supabase (ou via `psql`):
   - `01-tabelas.sql` — cria as tabelas.
   - `02-dados-exemplo.sql` — popula dados de exemplo.

## Equipe

| Nome | Função |
| ---- | ------ |
|      |        |
|      |        |
|      |        |
|      |        |
|      |        |
|      |        |
|      |        |
|      |        |
