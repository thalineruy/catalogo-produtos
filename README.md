# Catálogo de Produtos — Controle de Estoque Empresarial

Catálogo de produtos para uma ótica, com consulta por qualquer palavra do nome, imagem do produto, controle de quantidade e registro de saída.
Preparado para integração futura com o ERP.
Projeto Integrador II.

## Endereços públicos

- Telas: https://catalogo-produtos-eight.vercel.app
- API: https://catalogo-api-0vuy.onrender.com
- Banco: painel do Supabase, projeto catalogo-produtos

## Tecnologias

Node.js, Express, API REST, PostgreSQL no Supabase, HTML, CSS, JavaScript com Fetch API, Jest e Supertest, Vercel, Render, GitHub.

## Como rodar localmente

1. Clone o repositório.
2. Entre na pasta do servidor e instale as dependências:
   ```bash
   cd servidor
   npm install
   ```
3. Copie `.env.example` para `.env` dentro de `servidor/` e preencha os valores.
4. Inicie o servidor:
   ```bash
   npm start
   ```
5. Abra `telas/index.html` no navegador, com o `config.js` apontando para `localhost`.

## Como recriar o banco

Execute os scripts na pasta `banco/`, em ordem, no SQL Editor do Supabase:
1. `01-tabelas.sql` — cria as tabelas.
2. `02-dados-exemplo.sql` — popula dados de exemplo.
3. `03-saidas-observacao.sql` — adiciona o campo de observação às saídas.

## Login para testes locais

Os usuários de exemplo em `02-dados-exemplo.sql` usam a senha `senha123`
(hash bcrypt já incluído no script). Faça login em `telas/login.html` com
qualquer um dos e-mails cadastrados (ex.: `ana.souza@oticavisao.com` como
administrador, `beatriz.alves@oticavisao.com` como operador).

## Como rodar os testes

```bash
cd servidor
npm test
```

## Equipe

| Nome | Função |
| ---- | ------ |
|      | Coordenação e documentos |
|      | Banco de dados |
|      | Backend produtos e categorias |
|      | Backend estoque e permissões |
|      | Estudo de campo e testes |
|      | Frontend catálogo |
|      | Frontend relatórios e logs |
|      | Frontend administração |

## Aviso

O servidor no plano gratuito do Render hiberna após inatividade; a primeira chamada pode levar cerca de um minuto.
